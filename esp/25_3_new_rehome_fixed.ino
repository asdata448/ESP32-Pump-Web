#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <XPT2046_Touchscreen.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"

#define HISTORY_SIZE 5

struct SetupHistory {
  float tg;
  int drug;
  int totalSec;
};

SetupHistory history[HISTORY_SIZE];
int historyCount = 0;

#define ENA_PIN 25
#define DIR_PIN 32
#define PUL_PIN 33
#define TFT_CS 15
#define TFT_DC 4
#define TFT_RST 2
#define T_CS 14
#define T_IRQ 27
#define FSR_PIN 34
#define BUZZER_PIN 26
#define LIMIT_SWITCH_PIN 35

// WiFi AP Mode Credentials
const char* AP_SSID = "ESP32-PUMP";
const char* AP_PASSWORD = "12345678";

// WiFi Station Credentials - CHỈ DÙNG AP MODE ĐỂ LINH HOẠT
// Nếu muốn có internet, uncomment và điền thông tin WiFi nhà
// const char* STA_SSID = "YOUR_WIFI_SSID";
// const char* STA_PASSWORD = "YOUR_WIFI_PASS";
const bool USE_STA_MODE = false;  // false = chỉ AP mode (linh hoạt nhất), true = có internet

WebServer server(80);

Adafruit_ILI9341 tft(TFT_CS, TFT_DC, TFT_RST);
XPT2046_Touchscreen ts(T_CS, T_IRQ);

// Giá trị cảm ứng
int minX = 650, maxX = 3548, minY = 688, maxY = 3328;

// Điều khiển động cơ
volatile int pulseIntervalUs = 2000;
const int MIN_PULSE_US = 50;

// Cờ hệ thống
volatile bool contactJustFound = false;
volatile bool prepareInProgress = false;
volatile bool uiDirty = true;
volatile bool pumpScreenDirty = true;
volatile uint8_t prepareStep = 0;   // 0:none, 1:HOME, 2:FIND, 3:FOUND, 4:READY
unsigned long prepareStepMillis = 0;

// Cờ FSR / trạng thái
bool fsrAlert = false, doneAlert = false, contactFound = false, contactBeepDone = false;
const int FSR_PRESENCE_THRESHOLD = 450;
const int FSR_OCCLUSION_THRESHOLD = 2000;
volatile bool occlusionMonitorEnabled = false;
unsigned long pumpStartIgnoreUntil = 0;
unsigned long lastPumpUiUpdate = 0;
volatile bool isPaused = false;
bool homed = false;
volatile bool homingRequested = false, retractRequested = false, waitingForContact = false;
volatile bool rehomeInProgress = false;
volatile bool rehomeSuccessShown = false;
unsigned long rehomeSuccessMillis = 0;

struct SyringeItem {
  const char* label;
  int volume;
};

SyringeItem syringes[2] = {{"10CC", 10}, {"20CC", 20}};
int selectedSyringe = 0;

// Kích thước nút
int btnWidth = 250, btnHeight = 80, btnMargin = 20;

enum MenuState {
  STATE_BOOT,
  STATE_HOMING,
  STATE_SYRINGE,
  STATE_MAIN,
  STATE_SETUP,
  STATE_ADJUST,
  STATE_PREPARE,
  STATE_RESULT,
  STATE_ERROR,
  STATE_HISTORY,
  STATE_DONE,
  STATE_READY
};

volatile MenuState currentState = STATE_BOOT;

enum ErrorType {
  ERR_NONE,
  ERR_HOME_TIMEOUT,
  ERR_PISTON_NOT_FOUND,
  ERR_OCCLUSION
};

volatile ErrorType currentError = ERR_NONE;

// Thông số bơm
volatile float tgValue = 1.0;
volatile int drugValue = 5;
volatile bool adjustTG = false;
volatile float adjustFloatVal = 0;
volatile int adjustIntVal = 0;
volatile int adjustDirection = 0;

volatile bool pumpRunning = false;
volatile int remainingSec = 0;
volatile unsigned long totalStepsNeeded = 0;
volatile unsigned long stepsCompleted = 0;

unsigned long startMillis = 0, pausedMillis = 0;
bool firstStart = true;

QueueHandle_t touchQueue;

struct TouchEvent {
  int x;
  int y;
  bool pressed;
};

const int steps_per_rev = 200;
const int microsteps = 8;
const int total_steps_per_rev = steps_per_rev * microsteps;
const float lead_screw_pitch = 8.0;

// Thông số thực tế
float mm_per_ml[2] = {5.0, 3.33};
float steps_per_ml[2];
float ml_per_step[2];
float syringe_min_mlph[2] = {0.1, 0.1};
float syringe_max_mlph[2] = {60.0, 120.0};

const int HOMING_PULSE_US = 200;
const int CONTACT_PULSE_US = 500;

bool getTouch(int &x, int &y) {
  if (!ts.touched()) return false;

  long sx = 0, sy = 0;
  int valid = 0;

  for (int i = 0; i < 5; i++) {
    if (!ts.touched()) break;

    TS_Point p = ts.getPoint();
    int xx = map(p.x, minX, maxX, 0, tft.width());
    int yy = map(p.y, minY, maxY, 0, tft.height());

    if (xx >= 0 && xx < tft.width() && yy >= 0 && yy < tft.height()) {
      sx += xx;
      sy += yy;
      valid++;
    }

    delay(2);
  }

  if (valid < 3) return false;

  x = sx / valid;
  y = sy / valid;
  return true;
}

bool inExpandedRect(const TouchEvent &te, int x, int y, int w, int h, int padX = 10, int padY = 10) {
  return (te.x >= x - padX && te.x <= x + w + padX &&
          te.y >= y - padY && te.y <= y + h + padY);
}
int readFSRFiltered() {
  const int N = 10;
  long sum = 0;
  int minV = 4095;
  int maxV = 0;

  for (int i = 0; i < N; i++) {
    int v = analogRead(FSR_PIN);
    sum += v;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
    delayMicroseconds(300);
  }

  sum -= minV;
  sum -= maxV;
  return sum / (N - 2);
}
void drawButton(int x, int y, int w, int h, const char* label) {
  tft.fillRect(x, y, w, h, ILI9341_BLUE);
  tft.drawRect(x, y, w, h, ILI9341_WHITE);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);

  int16_t tx, ty;
  uint16_t tw, th;
  tft.getTextBounds(label, 0, 0, &tx, &ty, &tw, &th);
  tft.setCursor(x + (w - tw) / 2, y + (h - th) / 2);
  tft.println(label);
}

void drawButtonRound(int x, int y, int w, int h, const char* label) {
  int radius = 10;
  tft.fillRoundRect(x, y, w, h, radius, ILI9341_BLUE);
  tft.drawRoundRect(x, y, w, h, radius, ILI9341_WHITE);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);

  int16_t tx, ty;
  uint16_t tw, th;
  tft.getTextBounds(label, 0, 0, &tx, &ty, &tw, &th);
  tft.setCursor(x + (w - tw) / 2, y + (h - th) / 2);
  tft.println(label);
}

void drawPowerIcon(int cx, int cy, int r, int lw, uint16_t color) {
  for (float a = 55; a <= 305; a += 1.5) {
    float rad = a * PI / 180.0;
    int px = cx + (int)(r * sin(rad));
    int py = cy - (int)(r * cos(rad));
    tft.fillCircle(px, py, lw / 2 + 1, color);
  }
  tft.fillRoundRect(cx - lw / 2 - 1, cy - r - 14, lw + 2, r / 2 + 10, 3, color);
}

void drawSyringeSelectScreen() {
  tft.fillScreen(ILI9341_BLACK);

  tft.setTextSize(2);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(5, 20);
  tft.println("LUA CHON ONG TIEM:");

  int x = (tft.width() - btnWidth) / 2;
  int totalHeight = 2 * btnHeight + btnMargin;
  int startY = (tft.height() - totalHeight) / 2;
  if (startY < 70) startY = 70;

  drawButtonRound(x, startY, btnWidth, btnHeight, "Vinahankook 10ml");
  drawButtonRound(x, startY + btnHeight + btnMargin, btnWidth, btnHeight, "Vinahankook 20ml");

  // Back button at bottom
  drawButton(5, tft.height() - 50, 80, 40, "Back");
}

void drawMainMenu() {
  tft.fillScreen(ILI9341_BLACK);

  int x = (tft.width() - btnWidth) / 2;
  drawButton(x, btnMargin, btnWidth, btnHeight, "Start setup");
  drawButton(x, btnMargin + btnHeight + btnMargin, btnWidth, btnHeight, "History");
}

void drawSetupScreen() {
  tft.fillScreen(ILI9341_BLACK);

  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);

  tft.drawRect(5, 20, 230, 50, ILI9341_WHITE);
  tft.setCursor(15, 35);
  tft.print("Toc do: ");
  tft.print(tgValue, 1);
  tft.println(" ml/h");

  tft.drawRect(5, 90, 230, 50, ILI9341_WHITE);
  tft.setCursor(15, 105);
  tft.print("The tich: ");
  tft.print(drugValue);
  tft.println(" ml");

  drawButton(40, tft.height() - 80, 100, 60, "Prepare");
  drawButton(180, tft.height() - 80, 100, 60, "Edit");

  tft.setTextSize(1);
  tft.setCursor(tft.width() - 60, 5);
  tft.println(syringes[selectedSyringe].label);
}

void drawAdjustScreen(float val, bool isTG) {
  tft.fillScreen(ILI9341_BLACK);

  tft.setTextSize(3);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(tft.width() / 2 - 40, tft.height() / 2 - 30);

  if (isTG) tft.println(val, 1);
  else tft.println((int)val);

  int r = 30;

  tft.fillCircle(tft.width() / 2 + 80, tft.height() / 2, r, tft.color565(100, 180, 255));
  tft.drawCircle(tft.width() / 2 + 80, tft.height() / 2, r, ILI9341_WHITE);
  tft.setCursor(tft.width() / 2 + 73, tft.height() / 2 - 10);
  tft.println("+");

  tft.fillCircle(tft.width() / 2 - 80, tft.height() / 2, r, tft.color565(100, 180, 255));
  tft.drawCircle(tft.width() / 2 - 80, tft.height() / 2, r, ILI9341_WHITE);
  tft.setCursor(tft.width() / 2 - 87, tft.height() / 2 - 10);
  tft.println("-");

  drawButton(tft.width() / 2 - 50, tft.height() - 70, 100, 50, "OK");
}

void drawPrepareScreen(const char* activeStep) {
  tft.fillScreen(ILI9341_BLACK);

  tft.setTextColor(ILI9341_CYAN);
  tft.setTextSize(2);
  tft.setCursor(95, 10);
  tft.println("PREPARE");

  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(10, 40);
  tft.println("Cac buoc chuan bi:");

  tft.setTextColor(strcmp(activeStep, "HOME") == 0 ? ILI9341_YELLOW : ILI9341_WHITE);
  tft.setCursor(20, 75);
  tft.println("1. Dang ve vi tri home");

  tft.setTextColor(strcmp(activeStep, "FIND") == 0 ? ILI9341_YELLOW : ILI9341_WHITE);
  tft.setCursor(20, 105);
  tft.println("2. Dang tim piston");

  tft.setTextColor(strcmp(activeStep, "FOUND") == 0 ? ILI9341_GREEN : ILI9341_WHITE);
  tft.setCursor(20, 135);
  tft.println("3. Da nhan dien ong tiem");

  tft.setTextColor(strcmp(activeStep, "READY") == 0 ? ILI9341_GREEN : ILI9341_WHITE);
  tft.setCursor(20, 165);
  tft.println("4. San sang truyen");

  tft.drawRect(10, 200, 300, 25, ILI9341_WHITE);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(1);

  if (strcmp(activeStep, "HOME") == 0) {
    tft.setCursor(75, 208);
    tft.println("He thong dang ve vi tri home...");
  } else if (strcmp(activeStep, "FIND") == 0) {
    tft.setCursor(85, 208);
    tft.println("He thong dang tim piston...");
  } else if (strcmp(activeStep, "FOUND") == 0) {
    tft.setCursor(70, 208);
    tft.println("Da nhan dien dung ong tiem.");
  } else if (strcmp(activeStep, "READY") == 0) {
    tft.setCursor(85, 208);
    tft.println("Da san sang de truyen.");
  }
}

void drawHomingScreen(bool showSuccess) {
  tft.fillScreen(ILI9341_BLACK);

  tft.setTextColor(showSuccess ? ILI9341_GREEN : ILI9341_YELLOW);
  tft.setTextSize(2);
  tft.setCursor(rehomeInProgress ? 85 : 105, 40);
  tft.println(rehomeInProgress ? "RE-HOME" : "HOME");

  tft.drawRect(20, 90, 280, 70, ILI9341_WHITE);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);

  if (showSuccess) {
    tft.setCursor(95, 115);
    tft.println("Da ve home");
  } else if (rehomeInProgress) {
    tft.setCursor(30, 105);
    tft.println("Dang dua piston ve");
    tft.setCursor(65, 130);
    tft.println("vi tri nap ong");
  } else {
    tft.setCursor(55, 115);
    tft.println("Dang ve vi tri home");
  }
}

void drawReadyScreen() {
  tft.fillScreen(ILI9341_BLACK);

  int ts = (int)(drugValue / tgValue * 3600);

  tft.setTextColor(ILI9341_GREEN);
  tft.setTextSize(2);
  tft.setCursor(70, 10);
  tft.println("SAN SANG TRUYEN");

  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);

  int x = 20;
  int y0 = 45;
  int lineGap = 28;

  tft.setCursor(x, y0);
  tft.print("Loai ong: ");
  tft.println(syringes[selectedSyringe].label);

  tft.setCursor(x, y0 + lineGap);
  tft.print("Toc do: ");
  tft.print(tgValue, 1);
  tft.println(" ml/h");

  tft.setCursor(x, y0 + 2 * lineGap);
  tft.print("The tich: ");
  tft.print(drugValue);
  tft.println(" ml");

  tft.setCursor(x, y0 + 3 * lineGap);
  tft.printf("Thoi gian: %02d:%02d", ts / 60, ts % 60);

  tft.setTextSize(1);
  tft.setCursor(x, y0 + 3 * lineGap + 22);
  tft.setTextColor(contactFound ? ILI9341_GREEN : ILI9341_RED);
  tft.print("Trang thai: ");
  tft.print(contactFound ? "Da tim thay ong" : "Chua tim thay ong");

  // Hiển thị IP WiFi
  tft.setTextSize(1);
  tft.setTextColor(ILI9341_CYAN);
  tft.setCursor(5, tft.height() - 20);
  tft.printf("AP: %s", WiFi.softAPIP().toString().c_str());

  // Hiển thị STA IP nếu có kết nối WiFi nhà
  if (WiFi.status() == WL_CONNECTED && USE_STA_MODE) {
    tft.setCursor(5, tft.height() - 10);
    tft.printf("WIFI: %s", WiFi.localIP().toString().c_str());
  }

  drawButton(5, 175, 95, 55, "Start");
  drawButton(112, 175, 95, 55, "Re-home");
  drawButton(220, 175, 95, 55, "Edit");
}

void drawResultScreenStatic() {
  tft.fillScreen(ILI9341_BLACK);

  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);

  int x = 10;
  int y0 = 10;
  int lineGap = 25;

  tft.setCursor(x, y0);
  tft.print("Loai ong: ");
  tft.println(syringes[selectedSyringe].label);

  tft.setCursor(x, y0 + lineGap);
  tft.print("Toc do: ");
  tft.print(tgValue, 1);
  tft.println(" ml/h");

  tft.setCursor(x, y0 + 2 * lineGap);
  tft.print("The tich: ");
  tft.print(drugValue);
  tft.println(" ml");

  tft.setCursor(x, y0 + 3 * lineGap);
  tft.print("Da truyen: ");

  tft.setCursor(x, y0 + 4 * lineGap);
  tft.print("Thoi gian: ");

  tft.setCursor(x, y0 + 5 * lineGap);
  tft.print("Trang thai: ");

  tft.drawRect(10, 165, tft.width() - 20, 15, ILI9341_WHITE);

  drawButton(5, 185, 95, 50, "Pause");
  drawButton(112, 185, 95, 50, "Stop");
  drawButton(220, 185, 95, 50, "Resume");
}

void updateResultScreenDynamic(int ts) {
  float infusedMl = 0.0;
  if (totalStepsNeeded > 0) {
    infusedMl = ((float)stepsCompleted / (float)totalStepsNeeded) * drugValue;
  }

  if (infusedMl < 0) infusedMl = 0;
  if (infusedMl > drugValue) infusedMl = drugValue;

  int x = 10;
  int y0 = 10;
  int lineGap = 25;

  tft.fillRect(150, y0 + 3 * lineGap, 150, 22, ILI9341_BLACK);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(150, y0 + 3 * lineGap);
  tft.print(infusedMl, 1);
  tft.print(" ml");

  tft.fillRect(140, y0 + 4 * lineGap, 150, 22, ILI9341_BLACK);
  tft.setCursor(140, y0 + 4 * lineGap);
  tft.printf("%02d:%02d", ts / 60, ts % 60);

  tft.fillRect(150, y0 + 5 * lineGap, 140, 22, ILI9341_BLACK);
  tft.setCursor(150, y0 + 5 * lineGap);

  if (fsrAlert) tft.setTextColor(ILI9341_RED);
  else if (isPaused) tft.setTextColor(ILI9341_YELLOW);
  else tft.setTextColor(ILI9341_GREEN);

  if (fsrAlert) tft.print("Bao dong");
  else if (isPaused) tft.print("Tam dung");
  else tft.print("Dang truyen");

  tft.fillRect(11, 166, tft.width() - 22, 13, ILI9341_BLACK);
  int fw = 0;
  if (totalStepsNeeded > 0) {
    fw = (int)(((tft.width() - 22) * stepsCompleted) / totalStepsNeeded);
  }
  tft.fillRect(11, 166, fw, 13, ILI9341_GREEN);
}

void drawErrorScreen() {
  tft.fillScreen(ILI9341_BLACK);
  tft.setTextColor(ILI9341_RED);
  tft.setTextSize(3);

  if (currentError == ERR_HOME_TIMEOUT) {
    tft.setCursor(30, 90);
    tft.print("LOI VE HOME");
    tft.setTextSize(2);
    tft.setCursor(20, 140);
    tft.print("Khong tim thay home");
  }
  else if (currentError == ERR_PISTON_NOT_FOUND) {
    tft.setCursor(10, 90);
    tft.print("CHUA TIM THAY");
    tft.setCursor(70, 125);
    tft.print("PISTON");
    tft.setTextSize(2);
    tft.setCursor(20, 170);
    tft.print("Kiem tra ong tiem");
  }
  else if (currentError == ERR_OCCLUSION) {
    tft.setCursor(25, 100);
    tft.print("NGHEN ONG!");
    tft.setTextSize(2);
    tft.setCursor(20, 150);
    tft.print("Ap luc tang bat thuong");
  }
  else {
    tft.setCursor(70, 100);
    tft.print("CO LOI");
  }

  tft.setTextSize(2);
  tft.setCursor(20, 210);
  tft.print("Nhan de tiep tuc");
}

void drawHistoryScreen() {
  tft.fillScreen(ILI9341_BLACK);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(10, 10);
  tft.println("History:");

  int y = 40;
  for (int i = 0; i < historyCount; i++) {
    tft.setCursor(10, y);
    tft.printf("%d. %.1fml/h %dml %02d:%02d",
               i + 1, history[i].tg, history[i].drug,
               history[i].totalSec / 60, history[i].totalSec % 60);
    y += 30;
  }

  drawButton(tft.width() / 2 - 50, tft.height() - 70, 100, 50, "Back");
}

void addToHistory(float tg, int drug) {
  if (tg <= 0) return;

  for (int i = HISTORY_SIZE - 1; i > 0; i--) history[i] = history[i - 1];
  history[0] = {tg, drug, (int)(drug / tg * 3600)};

  if (historyCount < HISTORY_SIZE) historyCount++;
}

bool isLimitPressed() {
  int cnt = 0;
  for (int i = 0; i < 3; i++) {
    if (digitalRead(LIMIT_SWITCH_PIN) == LOW) cnt++;
    delayMicroseconds(500);
  }
  return cnt >= 2;
}

void calcMlPerStep() {
  for (int i = 0; i < 2; i++) {
    steps_per_ml[i] = (mm_per_ml[i] * total_steps_per_rev) / lead_screw_pitch;
    ml_per_step[i] = 1.0f / steps_per_ml[i];

    Serial.println("========================================");
    Serial.printf("Syringe %s:\n", syringes[i].label);
    Serial.printf("  [DO THUC TE] 1ml = %.2f mm\n", mm_per_ml[i]);
    Serial.printf("  Steps per ml: %.1f steps\n", steps_per_ml[i]);
    Serial.printf("  ml per step: %.9f ml\n", ml_per_step[i]);
  }
}

int calcPulseIntervalUsFromMlPerHour(float ml_h, int idx) {
  ml_h = constrain(ml_h, syringe_min_mlph[idx], syringe_max_mlph[idx]);
  float sps = (ml_h / 3600.0f) / ml_per_step[idx];
  int us = (int)(1e6 / (2.0f * sps));
  if (us < MIN_PULSE_US) us = MIN_PULSE_US;

  Serial.printf("Speed: %.2f ml/h -> %.3f steps/s -> %d us/half-pulse\n", ml_h, sps, us);
  return us;
}

void resetToInitialState() {
  pumpRunning = false;
  waitingForContact = false;
  isPaused = false;
  fsrAlert = false;

  firstStart = true;
  pausedMillis = 0;
  remainingSec = 0;
  stepsCompleted = 0;
  totalStepsNeeded = 0;

  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(ENA_PIN, HIGH);

  retractRequested = true;
  homed = false;

  currentState = STATE_SYRINGE;
  uiDirty = true;
  pumpScreenDirty = true;
  occlusionMonitorEnabled = false;
  pumpStartIgnoreUntil = 0;
}

void motorTask(void *pv) {
  pinMode(ENA_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(PUL_PIN, OUTPUT);

  digitalWrite(ENA_PIN, HIGH);

  while (true) {
              if (homingRequested) {
            digitalWrite(ENA_PIN, LOW);
            digitalWrite(DIR_PIN, LOW);

            unsigned long t0 = millis();
            bool homeFailed = false;

            while (!isLimitPressed()) {
              digitalWrite(PUL_PIN, HIGH);
              delayMicroseconds(HOMING_PULSE_US);
              digitalWrite(PUL_PIN, LOW);
              delayMicroseconds(HOMING_PULSE_US);

              vTaskDelay(1);

              if (millis() - t0 > 8000) {
              waitingForContact = false;
              digitalWrite(ENA_PIN, HIGH);
              homingRequested = false;
              homed = false;
              fsrAlert = false;
              currentError = ERR_HOME_TIMEOUT;
              currentState = STATE_ERROR;
              uiDirty = true;
              homeFailed = true;
              break;
            }
            }

            if (homeFailed) {
              vTaskDelay(10);
              continue;
            }

            digitalWrite(ENA_PIN, HIGH);
            homingRequested = false;
            homed = true;

            if (rehomeInProgress && currentState != STATE_ERROR) {
              rehomeSuccessShown = true;
              rehomeSuccessMillis = millis();
              currentState = STATE_HOMING;
              uiDirty = true;
            } else if (prepareInProgress && currentState != STATE_ERROR) {
              prepareStep = 2;
              currentState = STATE_PREPARE;
              uiDirty = true;
              waitingForContact = true;
            } else if (currentState != STATE_ERROR) {
              currentState = STATE_SYRINGE;
              uiDirty = true;
            }
          }

    else if (retractRequested) {
      digitalWrite(ENA_PIN, LOW);
      digitalWrite(DIR_PIN, LOW);

      unsigned long t0 = millis();

      while (!isLimitPressed()) {
        digitalWrite(PUL_PIN, HIGH);
        delayMicroseconds(HOMING_PULSE_US);
        digitalWrite(PUL_PIN, LOW);
        delayMicroseconds(HOMING_PULSE_US);

        vTaskDelay(1);

        if (millis() - t0 > 8000) break;
      }

      digitalWrite(ENA_PIN, HIGH);
      retractRequested = false;
      homed = true;
    }

    else if (waitingForContact) {
  digitalWrite(ENA_PIN, LOW);
  digitalWrite(DIR_PIN, HIGH);

  while (waitingForContact) {
    if (analogRead(FSR_PIN) > FSR_PRESENCE_THRESHOLD) {
      waitingForContact = false;
      contactFound = true;

      if (!contactBeepDone) {
        digitalWrite(BUZZER_PIN, HIGH);
        vTaskDelay(250);
        digitalWrite(BUZZER_PIN, LOW);
        contactBeepDone = true;
      }

      prepareStep = 3;
      prepareStepMillis = millis();
      currentState = STATE_PREPARE;
      uiDirty = true;

      digitalWrite(ENA_PIN, HIGH);
      break;
    }

    digitalWrite(PUL_PIN, HIGH);
    delayMicroseconds(CONTACT_PULSE_US);
    digitalWrite(PUL_PIN, LOW);
    delayMicroseconds(CONTACT_PULSE_US);

    vTaskDelay(1);
  }
}

    else if (pumpRunning) {
      digitalWrite(ENA_PIN, LOW);
      digitalWrite(DIR_PIN, HIGH);

      int us = pulseIntervalUs;
      if (us < MIN_PULSE_US) us = MIN_PULSE_US;

      digitalWrite(PUL_PIN, HIGH);
      delayMicroseconds(us);
      digitalWrite(PUL_PIN, LOW);
      delayMicroseconds(us);

      stepsCompleted++;

      if (millis() - lastPumpUiUpdate >= 200) {
        pumpScreenDirty = true;
        lastPumpUiUpdate = millis();
      }

      if (stepsCompleted >= totalStepsNeeded) {
        pumpRunning = false;
        digitalWrite(ENA_PIN, HIGH);
      }

      vTaskDelay(1);
    }

    else {
      digitalWrite(ENA_PIN, HIGH);
      digitalWrite(PUL_PIN, LOW);
      vTaskDelay(10);
    }
  }
}

void touchTask(void *pv) {
  TouchEvent te;

  bool touching = false;
  int lastX = 0, lastY = 0;
  int stableCount = 0;
  unsigned long touchStart = 0;

  while (true) {
    int x, y;
    bool ok = getTouch(x, y);

    if (ok) {
      lastX = x;
      lastY = y;

      if (!touching) {
        touching = true;
        stableCount = 1;
        touchStart = millis();
      } else {
        stableCount++;
      }
    } else {
      if (touching && stableCount >= 2 && (millis() - touchStart) >= 25) {
        te.x = lastX;
        te.y = lastY;
        te.pressed = true;
        xQueueSend(touchQueue, &te, 0);
      }

      touching = false;
      stableCount = 0;
    }

    vTaskDelay(10);
  }
}

void displayTask(void *pv) {
  TouchEvent te;
  static MenuState lastState = STATE_BOOT;

  while (true) {
    if (currentState == STATE_PREPARE && prepareStep == 3 &&
        millis() - prepareStepMillis > 600) {
      prepareStep = 4;
      prepareStepMillis = millis();
      uiDirty = true;
    } else if (currentState == STATE_PREPARE && prepareStep == 4 &&
               millis() - prepareStepMillis > 600) {
      prepareInProgress = false;
      currentState = STATE_READY;
      uiDirty = true;
    }

    if (currentState == STATE_HOMING && rehomeInProgress && rehomeSuccessShown &&
        millis() - rehomeSuccessMillis >= 700) {
      rehomeInProgress = false;
      rehomeSuccessShown = false;
      currentState = STATE_SYRINGE;
      uiDirty = true;
    }

    if (currentState != lastState || uiDirty) {
      lastState = currentState;
      uiDirty = false;

      if (currentState == STATE_BOOT) {
        tft.fillScreen(ILI9341_BLACK);
        drawPowerIcon(75, 120, 40, 9, ILI9341_WHITE);
        tft.setTextColor(ILI9341_WHITE);
        tft.setTextSize(2);
        tft.setCursor(140, 100);
        tft.println("Khoi dong");
        tft.setCursor(140, 128);
        tft.println("bom...");

        homingRequested = true;
        currentState = STATE_HOMING;
      }
      else if (currentState == STATE_HOMING) {
        drawHomingScreen(rehomeSuccessShown);
      }
      else if (currentState == STATE_SYRINGE) {
        drawSyringeSelectScreen();
      }
      else if (currentState == STATE_MAIN) {
        drawMainMenu();
      }
      else if (currentState == STATE_SETUP) {
        drawSetupScreen();
      }
      else if (currentState == STATE_ADJUST) {
        if (adjustTG) drawAdjustScreen(adjustFloatVal, true);
        else drawAdjustScreen((float)adjustIntVal, false);
      }
      else if (currentState == STATE_PREPARE) {
        if (prepareStep == 1) drawPrepareScreen("HOME");
        else if (prepareStep == 2) drawPrepareScreen("FIND");
        else if (prepareStep == 3) drawPrepareScreen("FOUND");
        else if (prepareStep == 4) drawPrepareScreen("READY");
      }
      else if (currentState == STATE_READY) {
        drawReadyScreen();
      }
      else if (currentState == STATE_RESULT) {
        drawResultScreenStatic();
        updateResultScreenDynamic(remainingSec);
        pumpScreenDirty = false;
      }
      else if (currentState == STATE_ERROR) {
        drawErrorScreen();
      }
      else if (currentState == STATE_HISTORY) {
        drawHistoryScreen();
      }
      else if (currentState == STATE_DONE) {
        tft.fillScreen(ILI9341_BLACK);
        tft.setTextColor(ILI9341_WHITE);
        tft.setTextSize(3);
        tft.setCursor(40, 120);
        tft.println("Hoan tat!");
        tft.setTextSize(2);
        tft.setCursor(50, 200);
        tft.println("Nhan de tiep tuc");
      }
    }

    if (currentState == STATE_RESULT && pumpScreenDirty) {
  updateResultScreenDynamic(remainingSec);
  pumpScreenDirty = false;
    }

    if (xQueueReceive(touchQueue, &te, 10)) {
      if (currentState == STATE_READY && te.pressed) {
        if (inExpandedRect(te, 5, 175, 95, 55, 12, 10)) {
          totalStepsNeeded = (unsigned long)(drugValue * steps_per_ml[selectedSyringe]);
          stepsCompleted = 0;
          fsrAlert = false;
          doneAlert = false;
          currentError = ERR_NONE;

          pumpRunning = true;
          isPaused = false;
          pausedMillis = 0;
          firstStart = true;
          startMillis = millis();

          occlusionMonitorEnabled = false;
          pumpStartIgnoreUntil = millis() + 1200;
          lastPumpUiUpdate = 0;

          totalSec = (int)(drugValue / tgValue * 3600);
          remainingSec = totalSec;

          addToHistory(tgValue, drugValue);

          currentState = STATE_RESULT;
          uiDirty = true;
          pumpScreenDirty = true;
        }
        else if (inExpandedRect(te, 112, 175, 95, 55, 12, 10)) {
          contactFound = false;
          contactBeepDone = false;
          currentError = ERR_NONE;
          prepareInProgress = false;
          waitingForContact = false;
          prepareStep = 0;
          rehomeInProgress = true;
          rehomeSuccessShown = false;
          currentState = STATE_HOMING;
          uiDirty = true;

          homed = false;
          homingRequested = true;
        }
        else if (inExpandedRect(te, 220, 175, 95, 55, 12, 10)) {
          contactFound = false;
          contactBeepDone = false;
          currentState = STATE_SETUP;
          uiDirty = true;
        }
      }

      else if (currentState == STATE_HISTORY && te.pressed &&
               te.x >= tft.width() / 2 - 50 && te.x <= tft.width() / 2 + 50 &&
               te.y >= tft.height() - 70) {
        currentState = STATE_MAIN;
        uiDirty = true;
      }

      else if (currentState == STATE_ERROR && te.pressed) {
        fsrAlert = false;
        currentError = ERR_NONE;
        digitalWrite(BUZZER_PIN, LOW);

        if (stepsCompleted > 0 && !doneAlert) {
          currentState = STATE_RESULT;
          pumpScreenDirty = true;
        } else {
          currentState = STATE_SETUP;
        }
        uiDirty = true;
      }

      else if (currentState == STATE_SYRINGE && te.pressed) {
        // Check Back button first
        if (inExpandedRect(te, 5, tft.height() - 50, 80, 40, 10, 10)) {
          currentState = STATE_MAIN;
          uiDirty = true;
        }
        else {
          // Check syringe selection buttons
          int x0 = (tft.width() - btnWidth) / 2;
          int totalHeight = 2 * btnHeight + btnMargin;
          int startY = (tft.height() - totalHeight) / 2;
          if (startY < 70) startY = 70;

          for (int i = 0; i < 2; i++) {
            if (te.x >= x0 && te.x <= x0 + btnWidth &&
                te.y >= startY + i * (btnHeight + btnMargin) &&
                te.y <= startY + i * (btnHeight + btnMargin) + btnHeight) {
              selectedSyringe = i;
              currentState = STATE_MAIN;
              uiDirty = true;
            }
          }
        }
      }

      else if (currentState == STATE_MAIN && te.pressed) {
        int x0 = (tft.width() - btnWidth) / 2;

        if (te.x >= x0 && te.x <= x0 + btnWidth &&
            te.y >= btnMargin && te.y <= btnMargin + btnHeight) {
          currentState = STATE_SETUP;
          uiDirty = true;
        }
        else if (te.x >= x0 && te.x <= x0 + btnWidth &&
                 te.y >= btnMargin * 2 + btnHeight &&
                 te.y <= btnMargin * 2 + btnHeight * 2) {
          currentState = STATE_HISTORY;
          uiDirty = true;
        }
      }

      else if (currentState == STATE_SETUP && te.pressed) {
        if (te.x >= 5 && te.x <= 235 && te.y >= 20 && te.y <= 70) {
          adjustTG = true;
          adjustFloatVal = tgValue;
          currentState = STATE_ADJUST;
          uiDirty = true;
        }
        else if (te.x >= 5 && te.x <= 235 && te.y >= 90 && te.y <= 140) {
          adjustTG = false;
          adjustIntVal = drugValue;
          currentState = STATE_ADJUST;
          uiDirty = true;
        }
        else if (inExpandedRect(te, 40, tft.height() - 80, 100, 60, 10, 10)) {
          if (tgValue <= 0) {
            tft.setTextColor(ILI9341_RED, ILI9341_BLACK);
            tft.setTextSize(2);
            tft.setCursor(10, 160);
            tft.println("Toc do > 0!");
          } else {
            totalSec = (int)(drugValue / tgValue * 3600);
            remainingSec = totalSec;
            pulseIntervalUs = calcPulseIntervalUsFromMlPerHour(tgValue, selectedSyringe);

            contactFound = false;
            contactBeepDone = false;
            prepareInProgress = true;

            if (!homed) {
              prepareStep = 1;
              currentState = STATE_PREPARE;
              uiDirty = true;
              homingRequested = true;
            } else {
              prepareStep = 2;
              currentState = STATE_PREPARE;
              uiDirty = true;
              waitingForContact = true;
            }
          }
        }
        else if (inExpandedRect(te, 180, tft.height() - 80, 100, 60, 10, 10)) {
          currentState = STATE_MAIN;
          uiDirty = true;
        }
      }

      else if (currentState == STATE_ADJUST && te.pressed) {
        if (te.x >= tft.width() / 2 - 110 && te.x <= tft.width() / 2 - 50 &&
            te.y >= tft.height() / 2 - 30 && te.y <= tft.height() / 2 + 30) {
          adjustDirection = -1;
        }
        else if (te.x >= tft.width() / 2 + 50 && te.x <= tft.width() / 2 + 110 &&
                 te.y >= tft.height() / 2 - 30 && te.y <= tft.height() / 2 + 30) {
          adjustDirection = 1;
        }
        else if (te.x >= tft.width() / 2 - 50 && te.x <= tft.width() / 2 + 50 &&
                 te.y >= tft.height() - 70) {
          if (adjustTG) tgValue = round(adjustFloatVal * 10) / 10;
          else drugValue = adjustIntVal;
          currentState = STATE_SETUP;
          uiDirty = true;
        }
        else {
          adjustDirection = 0;
        }
      }

      else if (currentState == STATE_RESULT && te.pressed) {
        if (inExpandedRect(te, 5, 185, 95, 50, 12, 10)) {
          pumpRunning = false;
          isPaused = true;
          pausedMillis = millis() - startMillis;
          occlusionMonitorEnabled = false;
          digitalWrite(ENA_PIN, HIGH);
          pumpScreenDirty = true;
        }
        else if (inExpandedRect(te, 112, 185, 95, 50, 12, 10)) {
          pumpRunning = false;
          isPaused = false;
          digitalWrite(ENA_PIN, HIGH);
          resetToInitialState();
        }
        else if (inExpandedRect(te, 220, 185, 95, 50, 12, 10) && isPaused) {
        pumpRunning = true;
        isPaused = false;
        startMillis = millis() - pausedMillis;
        occlusionMonitorEnabled = false;
        pumpStartIgnoreUntil = millis() + 800;
        pumpScreenDirty = true;
      }
      }

      else if (currentState == STATE_DONE && te.pressed) {
        doneAlert = false;
        currentState = STATE_SYRINGE;
        uiDirty = true;
      }
    }

    if (currentState == STATE_ADJUST && adjustDirection != 0) {
      if (adjustTG) {
        adjustFloatVal += adjustDirection * 0.1;
        adjustFloatVal = constrain(adjustFloatVal,
                                   syringe_min_mlph[selectedSyringe],
                                   syringe_max_mlph[selectedSyringe]);
      } else {
        adjustIntVal += adjustDirection;
        adjustIntVal = constrain(adjustIntVal, 0, syringes[selectedSyringe].volume);
      }

      adjustDirection = 0;
      uiDirty = true;
    }

    vTaskDelay(20);
  }
}

void fsrTask(void *pv) {
  static int highCount = 0;

  while (true) {
    int fsr = readFSRFiltered();

    if (pumpRunning && contactFound && millis() > pumpStartIgnoreUntil) {
      occlusionMonitorEnabled = true;
    }

    if (pumpRunning && contactFound && occlusionMonitorEnabled) {
      if (fsr > FSR_OCCLUSION_THRESHOLD) {
        highCount++;
      } else {
        highCount = 0;
      }
    }
      if (highCount >= 3 && !fsrAlert) {
  fsrAlert = true;
  pumpRunning = false;
  isPaused = true;
  pausedMillis = millis() - startMillis;

  digitalWrite(BUZZER_PIN, HIGH);
  digitalWrite(ENA_PIN, HIGH);

  currentError = ERR_OCCLUSION;
  currentState = STATE_ERROR;
  uiDirty = true;

  highCount = 0;
}

    if (!fsrAlert && !waitingForContact) {
      digitalWrite(BUZZER_PIN, LOW);
    }

    vTaskDelay(50);
  }
}

void countdownTask(void *pv) {
  int lastRemain = -1;

  while (true) {
    if (currentState == STATE_RESULT) {
      if (fsrAlert) {
        pumpRunning = false;
        vTaskDelay(100);
        continue;
      }

      if (pumpRunning && totalStepsNeeded > 0) {
        int ts = (int)(drugValue / tgValue * 3600);

        // Calculate elapsed time from actual running time (accounting for pause)
        unsigned long elapsed = 0;
        if (!isPaused) {
          if (pausedMillis > 0) {
            // Was paused before, so elapsed includes time before pause
            elapsed = pausedMillis;
          } else {
            // Currently running
            elapsed = millis() - startMillis;
          }
        } else {
          // Currently paused
          elapsed = pausedMillis;
        }

        int es = (int)(elapsed / 1000);  // Convert to seconds

        if (stepsCompleted >= totalStepsNeeded) {
          es = ts;
          pumpRunning = false;

          if (!doneAlert) {
            doneAlert = true;
            retractRequested = true;
            homed = false;
            currentState = STATE_DONE;
            uiDirty = true;
          }
        }

        remainingSec = ts - es;
        if (remainingSec < 0) remainingSec = 0;

        if (remainingSec != lastRemain) {
          pumpScreenDirty = true;
          lastRemain = remainingSec;
        }
      }
    }

    vTaskDelay(100);  // Update 10 times per second
  }
}

// ============================================================
// WiFi & API Functions
// ============================================================

// Map MenuState enum to string for API
const char* stateToString(MenuState state) {
  switch(state) {
    case STATE_BOOT: return "BOOT";
    case STATE_SYRINGE: return "SYRINGE";
    case STATE_MAIN: return "MAIN";
    case STATE_SETUP: return "SETUP";
    case STATE_ADJUST: return "ADJUST";
    case STATE_PREPARE: return "PREPARE";
    case STATE_READY: return "READY";
    case STATE_RESULT: return "RESULT";
    case STATE_ERROR: return "ERROR";
    case STATE_DONE: return "DONE";
    case STATE_HOMING: return "PREPARE"; // HOMING maps to PREPARE for web
    default: return "MAIN";
  }
}

// Send CORS headers for all responses
void sendCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

// GET /api/status - Return current pump status
void handleStatus() {
  sendCORS();
  DynamicJsonDocument doc(1024);

  doc["state"] = stateToString(currentState);
  doc["syringe"] = syringes[selectedSyringe].label;
  doc["syringe_index"] = selectedSyringe;
  doc["speed_mlh"] = tgValue;
  doc["volume_ml"] = drugValue;
  doc["remaining_sec"] = remainingSec;
  doc["steps_completed"] = stepsCompleted;
  doc["steps_total"] = totalStepsNeeded;
  doc["homed"] = homed;
  doc["contact_found"] = contactFound;
  doc["fsr_alert"] = fsrAlert;
  doc["pump_running"] = pumpRunning;
  doc["paused"] = isPaused;
  doc["fsr_raw"] = analogRead(FSR_PIN);
  doc["fsr_presence_threshold"] = FSR_PRESENCE_THRESHOLD;
  doc["fsr_occlusion_threshold"] = FSR_OCCLUSION_THRESHOLD;
  doc["limit_pressed"] = isLimitPressed();
  doc["buzzer_on"] = digitalRead(BUZZER_PIN) == HIGH;
  doc["ip"] = WiFi.softAPIP().toString();
  doc["wifi_mode"] = "AP";

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// GET/POST /api/config - Get or set pump configuration
void handleConfig() {
  sendCORS();
  if (server.method() == HTTP_GET) {
    DynamicJsonDocument doc(256);
    doc["syringe_index"] = selectedSyringe;
    doc["speed_mlh"] = tgValue;
    doc["volume_ml"] = drugValue;
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  }
  else { // POST
    String body = server.arg("plain");
    DynamicJsonDocument doc(256);
    DeserializationError error = deserializeJson(doc, body);

    if (error) {
      server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
      return;
    }

    int idx = doc["syringe_index"];
    float speed = doc["speed_mlh"];
    int vol = doc["volume_ml"];

    // Validate
    if (speed <= 0 || speed > 999 || vol <= 0 || vol > 99) {
      server.send(400, "application/json", "{\"error\":\"Invalid parameters\"}");
      return;
    }

    selectedSyringe = constrain(idx, 0, 1);
    tgValue = speed;
    drugValue = vol;

    pulseIntervalUs = calcPulseIntervalUsFromMlPerHour(tgValue, selectedSyringe);
    uiDirty = true;

    server.send(200, "application/json", "{\"status\":\"ok\"}");
  }
}

// POST /api/start - Start pumping
void handleStart() {
  sendCORS();
  if (currentState != STATE_READY && currentState != STATE_PREPARE) {
    server.send(400, "application/json", "{\"error\":\"Not ready\"}");
    return;
  }
  if (!contactFound) {
    server.send(400, "application/json", "{\"error\":\"No syringe contact\"}");
    return;
  }

  // Trigger start - same as touch handler
  totalStepsNeeded = (unsigned long)(drugValue * steps_per_ml[selectedSyringe]);
  stepsCompleted = 0;
  fsrAlert = false;
  doneAlert = false;
  currentError = ERR_NONE;
  pumpRunning = true;
  isPaused = false;
  pausedMillis = 0;
  firstStart = true;
  startMillis = millis();
  occlusionMonitorEnabled = false;
  pumpStartIgnoreUntil = millis() + 1200;
  lastPumpUiUpdate = 0;

  int totalSec = (int)(drugValue / tgValue * 3600);
  remainingSec = totalSec;

  addToHistory(tgValue, drugValue);

  currentState = STATE_RESULT;
  uiDirty = true;
  pumpScreenDirty = true;

  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

// POST /api/pause - Pause pumping
void handlePause() {
  sendCORS();
  if (pumpRunning && !isPaused) {
    pumpRunning = false;
    isPaused = true;
    pausedMillis = millis() - startMillis;
    occlusionMonitorEnabled = false;
    digitalWrite(ENA_PIN, HIGH);
    pumpScreenDirty = true;
    uiDirty = true;
  }
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

// POST /api/resume - Resume pumping
void handleResume() {
  sendCORS();
  if (isPaused) {
    pumpRunning = true;
    isPaused = false;
    startMillis = millis() - pausedMillis;
    occlusionMonitorEnabled = false;
    pumpStartIgnoreUntil = millis() + 800;
    pumpScreenDirty = true;
    uiDirty = true;
  }
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

// POST /api/stop - Stop and reset
void handleStop() {
  sendCORS();
  pumpRunning = false;
  isPaused = false;
  resetToInitialState();
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

// POST /api/rehome - Re-home the piston
void handleRehome() {
  sendCORS();
  contactFound = false;
  contactBeepDone = false;
  currentError = ERR_NONE;
  prepareInProgress = false;
  waitingForContact = false;
  prepareStep = 0;
  rehomeInProgress = true;
  rehomeSuccessShown = false;
  currentState = STATE_HOMING;
  uiDirty = true;
  homed = false;
  homingRequested = true;
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

// POST /api/prepare - Prepare for pumping
void handlePrepare() {
  sendCORS();
  if (tgValue <= 0) {
    server.send(400, "application/json", "{\"error\":\"Invalid speed\"}");
    return;
  }

  int totalSec = (int)(drugValue / tgValue * 3600);
  remainingSec = totalSec;
  pulseIntervalUs = calcPulseIntervalUsFromMlPerHour(tgValue, selectedSyringe);

  contactFound = false;
  contactBeepDone = false;
  prepareInProgress = true;

  if (!homed) {
    prepareStep = 1;
    currentState = STATE_PREPARE;
    uiDirty = true;
    homingRequested = true;
  } else {
    prepareStep = 2;
    currentState = STATE_PREPARE;
    uiDirty = true;
    waitingForContact = true;
  }
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

// POST /api/reset_alarm - Reset FSR alert
void handleResetAlarm() {
  sendCORS();
  fsrAlert = false;
  currentError = ERR_NONE;
  digitalWrite(BUZZER_PIN, LOW);

  if (stepsCompleted > 0 && !doneAlert) {
    currentState = STATE_RESULT;
    pumpScreenDirty = true;
  } else {
    currentState = STATE_SETUP;
  }
  uiDirty = true;
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

// GET /api/history - Get pump history
void handleHistory() {
  sendCORS();
  DynamicJsonDocument doc(1024);
  JsonArray arr = doc.to<JsonArray>();

  for (int i = 0; i < historyCount; i++) {
    JsonObject entry = arr.createNestedObject();
    entry["speed_mlh"] = history[i].tg;
    entry["volume_ml"] = history[i].drug;
    entry["total_sec"] = history[i].totalSec;
    entry["syringe"] = (history[i].drug <= 10) ? "10CC" : "20CC"; // Approximation
  }

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// Handle OPTIONS for CORS preflight
void handleOptions() {
  sendCORS();
  server.send(204);
}

// HTML page for root access - Simple web interface
const char HTML_PAGE[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ESP32 BomTiem Control</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;background:#1a1a2e;color:#fff;padding:10px;max-width:600px;margin:0 auto}
.card{background:#16213e;border-radius:10px;padding:15px;margin-bottom:10px}
.header{text-align:center;padding:10px;margin-bottom:15px}
.status{display:flex;justify-content:space-between;padding:10px;background:#0f3460;border-radius:8px;margin-bottom:10px}
.state{font-weight:bold;padding:5px 10px;border-radius:5px}
.state.READY{background:#4ade80;color:#064e3b}
.state.PREPARE{background:#fbbf24;color:#78350f}
.state.RESULT{background:#60a5fa;color:#1e3a8a}
.state.ERROR{background:#f87171;color:#7f1d1d}
.btn{border:none;padding:12px 20px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:bold;margin:5px;flex:1}
.btn-start{background:#4ade80;color:#064e3b}
.btn-stop{background:#f87171;color:#7f1d1d}
.btn-pause{background:#fbbf24;color:#78350f}
.btn-primary{background:#60a5fa;color:#1e3a8a}
.btn-secondary{background:#475569;color:#fff}
.btn:disabled{opacity:0.5;cursor:not-allowed}
.row{display:flex;gap:10px;margin-bottom:10px}
.input-group{margin-bottom:10px}
.input-group label{display:block;margin-bottom:5px;color:#94a3b8}
.input-group input{width:100%;padding:10px;border:1px solid #475569;border-radius:8px;background:#1a1a2e;color:#fff;font-size:16px}
.progress-bar{width:100%;height:20px;background:#1a1a2e;border-radius:10px;overflow:hidden;margin:10px 0}
.progress-fill{height:100%;background:#4ade80;transition:width 0.3s}
.info{font-size:14px;color:#94a3b8;padding:5px 0}
.warning{background:#fbbf24;color:#78350f;padding:10px;border-radius:8px;margin-bottom:10px}
.success{background:#4ade80;color:#064e3b;padding:10px;border-radius:8px;margin-bottom:10px}
</style>
</head>
<body>
<div class="header">
<h1>⚕️ ESP32 BơmTiem</h1>
<p class="info">Điều khiển bơm tiêm từ xa</p>
</div>

<div id="app">
<div class="card">
<div class="status">
<div>
<span>Trạng thái: </span>
<span id="state" class="state">--</span>
</div>
<div id="contactStatus"></div>
</div>
<div class="info">
<p id="syringe">Loại: --</p>
<p id="speed">Tốc độ: --</p>
<p id="volume">Thể tích: --</p>
<p id="time">Thời gian: --</p>
</div>
</div>

<div class="card" id="controlCard">
<div class="row">
<button class="btn btn-start" id="btnStart" onclick="start()">Bắt đầu</button>
<button class="btn btn-pause" id="btnPause" onclick="pause()">Tạm dừng</button>
<button class="btn btn-stop" id="btnStop" onclick="stop()">Dừng</button>
</div>
<div class="row">
<button class="btn btn-secondary" onclick="prepare()">Prepare</button>
<button class="btn btn-secondary" onclick="rehome()">Re-home</button>
<button class="btn btn-secondary" onclick="showConfig()">Cài đặt</button>
</div>
</div>

<div class="progress-bar">
<div class="progress-fill" id="progress"></div>
</div>
<p class="info">Đã tiêm: <span id="infused">0</span> ml | Còn lại: <span id="remaining">--</span></p>

<div class="card" id="configCard" style="display:none">
<h3>Cài đặt</h3>
<div class="input-group">
<label>Loại ống:</label>
<select id="syringeSelect" onchange="updateConfig()">
<option value="0">10CC (10ml)</option>
<option value="1">20CC (20ml)</option>
</select>
</div>
<div class="input-group">
<label>Tốc độ (ml/h):</label>
<input type="number" id="speedInput" step="0.1" min="0.1" max="120" value="1.0">
</div>
<div class="input-group">
<label>Thể tích (ml):</label>
<input type="number" id="volumeInput" step="1" min="1" max="99" value="5">
</div>
<div class="row">
<button class="btn btn-primary" onclick="saveConfig()">Lưu</button>
<button class="btn btn-secondary" onclick="hideConfig()">Đóng</button>
</div>
</div>

<div class="card" id="alertCard" style="display:none">
<p id="alertMsg"></p>
</div>

<div class="card">
<h3>Lịch sử</h3>
<div id="history"></div>
</div>
</div>

<script>
let apiBase = '';
let pollInterval;

async function updateStatus() {
  try {
    const res = await fetch(apiBase + '/api/status');
    const data = await res.json();

    document.getElementById('state').textContent = data.state;
    document.getElementById('state').className = 'state ' + data.state;
    document.getElementById('syringe').textContent = 'Loại: ' + data.syringe;
    document.getElementById('speed').textContent = 'Tốc độ: ' + data.speed_mlh + ' ml/h';
    document.getElementById('volume').textContent = 'Thể tích: ' + data.volume_ml + ' ml';

    const mins = Math.floor(data.remaining_sec / 60);
    const secs = data.remaining_sec % 60;
    document.getElementById('time').textContent = 'Thời gian: ' + String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0');

    document.getElementById('contactStatus').innerHTML = data.contact_found
      ? '<span style="color:#4ade80">✓ Đã nhận diện ống</span>'
      : '<span style="color:#f87171">⚠ Chưa nhận diện ống</span>';

    const progress = data.steps_total > 0 ? (data.steps_completed / data.steps_total * 100) : 0;
    document.getElementById('progress').style.width = progress + '%';

    const infused = data.steps_total > 0 ? (data.steps_completed / data.steps_total * data.volume_ml).toFixed(1) : 0;
    document.getElementById('infused').textContent = infused;
    document.getElementById('remaining').textContent = data.remaining_sec + 's';

    // Update buttons
    const canStart = (data.state === 'READY' || data.state === 'PREPARE') && data.contact_found && !data.pump_running;
    const canPause = data.pump_running && !data.paused;
    const canResume = data.pump_running && data.paused;

    document.getElementById('btnStart').disabled = !canStart;
    document.getElementById('btnPause').disabled = !canPause;
    document.getElementById('btnStop').disabled = !data.pump_running && data.state !== 'READY' && data.state !== 'PREPARE';

    // Show alerts
    const alertCard = document.getElementById('alertCard');
    if (data.fsr_alert || data.state === 'ERROR') {
      alertCard.style.display = 'block';
      alertCard.className = 'card warning';
      document.getElementById('alertMsg').textContent = data.fsr_alert ? 'CẢNH BÁO: Áp lực cao!' : 'Lỗi hệ thống!';
    } else if (data.state === 'DONE') {
      alertCard.style.display = 'block';
      alertCard.className = 'card success';
      document.getElementById('alertMsg').textContent = '✓ Hoàn thành!';
    } else {
      alertCard.style.display = 'none';
    }

  } catch(e) {
    console.error(e);
  }
}

async function updateHistory() {
  try {
    const res = await fetch(apiBase + '/api/history');
    const data = await res.json();
    const historyDiv = document.getElementById('history');
    if (data.length === 0) {
      historyDiv.innerHTML = '<p class="info">Chưa có lịch sử</p>';
    } else {
      historyDiv.innerHTML = data.map((h, i) =>
        `<p class="info">${i+1}. ${h.speed_mlh} ml/h, ${h.volume_ml} ml, ${Math.floor(h.total_sec/60)}:${String(h.total_sec%60).padStart(2,'0')}</p>`
      ).join('');
    }
  } catch(e) {}
}

async function apiCall(endpoint, method = 'POST', body = null) {
  try {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(apiBase + endpoint, options);
    return await res.json();
  } catch(e) {
    alert('Lỗi kết nối: ' + e.message);
    return null;
  }
}

function showConfig() {
  document.getElementById('configCard').style.display = 'block';
}

function hideConfig() {
  document.getElementById('configCard').style.display = 'none';
}

async function saveConfig() {
  const config = {
    syringe_index: parseInt(document.getElementById('syringeSelect').value),
    speed_mlh: parseFloat(document.getElementById('speedInput').value),
    volume_ml: parseInt(document.getElementById('volumeInput').value)
  };
  await apiCall('/api/config', 'POST', config);
  hideConfig();
  updateStatus();
}

async function prepare() { await apiCall('/api/prepare'); updateStatus(); }
async function start() { await apiCall('/api/start'); updateStatus(); }
async function pause() { await apiCall('/api/pause'); updateStatus(); }
async function resume() { await apiCall('/api/resume'); updateStatus(); }
async function stop() { await apiCall('/api/stop'); updateStatus(); }
async function rehome() { await apiCall('/api/rehome'); updateStatus(); }

// Start polling
updateStatus();
updateHistory();
pollInterval = setInterval(() => { updateStatus(); updateHistory(); }, 1000);
</script>
</body>
</html>
)rawliteral";

// Handler for root page - serve HTML interface
void handleRoot() {
  server.send(200, "text/html", HTML_PAGE);
}

// Setup all web routes
void setupWebRoutes() {
  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/status", HTTP_GET, handleStatus);
  server.on("/api/config", HTTP_GET, handleConfig);
  server.on("/api/config", HTTP_POST, handleConfig);
  server.on("/api/start", HTTP_POST, handleStart);
  server.on("/api/pause", HTTP_POST, handlePause);
  server.on("/api/resume", HTTP_POST, handleResume);
  server.on("/api/stop", HTTP_POST, handleStop);
  server.on("/api/rehome", HTTP_POST, handleRehome);
  server.on("/api/prepare", HTTP_POST, handlePrepare);
  server.on("/api/reset_alarm", HTTP_POST, handleResetAlarm);
  server.on("/api/history", HTTP_GET, handleHistory);
  server.onNotFound([]() {
    sendCORS();
    server.send(404, "application/json", "{\"error\":\"Not found\"}");
  });
}

// WiFi task - runs web server
void wifiTask(void *pv) {
  // Start AP mode (luôn bật để điều khiển)
  WiFi.softAP(AP_SSID, AP_PASSWORD);
  IPAddress apIP = WiFi.softAPIP();

  Serial.println("========================================");
  Serial.println("WiFi AP Started");
  Serial.print("AP SSID: ");
  Serial.println(AP_SSID);
  Serial.print("AP IP: ");
  Serial.println(apIP);

  // Kết nối WiFi nhà (STA mode) nếu được kích hoạt
  if (USE_STA_MODE && strlen(STA_SSID) > 0) {
    Serial.println("----------------------------------------");
    Serial.println("Connecting to home WiFi...");
    Serial.print("SSID: ");
    Serial.println(STA_SSID);

    WiFi.mode(WIFI_AP_STA);  // AP + STA cùng lúc
    WiFi.begin(STA_SSID, STA_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nConnected!");
      Serial.print("STA IP: ");
      Serial.println(WiFi.localIP());
      Serial.println("Internet: Available");
    } else {
      Serial.println("\nFailed to connect to home WiFi");
      Serial.println("Continuing in AP-only mode (no internet)");
    }
    Serial.println("========================================");
  } else {
    Serial.println("========================================");
    Serial.println("AP-only mode (no internet)");
    Serial.println("To enable internet: Set USE_STA_MODE=true and enter WiFi credentials");
    Serial.println("========================================");
  }

  setupWebRoutes();
  server.begin();

  while (true) {
    server.handleClient();
    vTaskDelay(10);
  }
}

void setup() {
  Serial.begin(115200);

  tft.begin();
  tft.setRotation(3);

  pinMode(T_CS, OUTPUT);
  digitalWrite(T_CS, HIGH);

  pinMode(T_IRQ, INPUT_PULLUP);
  pinMode(FSR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LIMIT_SWITCH_PIN, INPUT_PULLUP);

  digitalWrite(BUZZER_PIN, LOW);
  ts.begin();

  touchQueue = xQueueCreate(10, sizeof(TouchEvent));

  calcMlPerStep();

  currentState = STATE_BOOT;
  uiDirty = true;
  pumpScreenDirty = true;
  prepareStep = 0;
  homed = false;
  homingRequested = false;

  xTaskCreate(touchTask, "Touch", 4096, NULL, 1, NULL);
  xTaskCreate(displayTask, "Display", 12000, NULL, 1, NULL);
  xTaskCreate(motorTask, "Motor", 4096, NULL, 1, NULL);
  xTaskCreate(countdownTask, "Countdown", 4096, NULL, 1, NULL);
  xTaskCreate(fsrTask, "FSR", 3072, NULL, 1, NULL);
  xTaskCreate(wifiTask, "WiFi", 8192, NULL, 1, NULL);
}

void loop() {}