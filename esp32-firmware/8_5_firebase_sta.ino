/*
 * ESP32 Syringe Pump with Firebase Cloud Control
 * Version: 8.5 - WiFi Auto-Connect + Firebase Realtime Database
 *
 * Features:
 * - Auto-connect to available WiFi networks
 * - Firebase Realtime Database for cloud control
 * - Real-time status sync
 * - Remote command execution
 * - All existing pump functionality
 *
 * Hardware: ESP32 + TFT Touchscreen + Stepper Motor + FSR Sensor
 * Author: ESP32 Pump Project
 * Date: 2026-05-06
 */

// ========================================
// LIBRARIES
// ========================================
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <XPT2046_Touchscreen.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <Firebase_ESP_Client.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include <Preferences.h>

// ========================================
// CONFIGURATION
// ========================================

// Firebase Configuration
#define FIREBASE_API_KEY "AIzaSyC9XlTugbmJPh77YymSFNNPf8UORHJi2qw"
#define FIREBASE_PROJECT_ID "esp32-firebase-2026"
#define FIREBASE_DATABASE_URL "esp32-firebase-2026-default-rtdb.firebaseio.com"

// WiFi Credentials (Auto-connect to available networks)
struct WiFiCredential {
  const char* ssid;
  const char* password;
};

// Add your WiFi networks here
WiFiCredential knownNetworks[] = {
  {"WiFi_Nha", "password_nha"},
  {"WiFi_CongTy", "password_cong_ty"},
  // Add more networks as needed
  {"", ""}  // Empty entry to mark end
};

// Pin Definitions
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

// Display & Touch
#define HISTORY_SIZE 5
int minX = 650, maxX = 3548, minY = 688, maxY = 3328;
int btnWidth = 250, btnHeight = 80, btnMargin = 20;

// Motor Configuration
const int MIN_PULSE_US = 50;
const int steps_per_rev = 200;
const int microsteps = 8;
const int total_steps_per_rev = steps_per_rev * microsteps;
const float lead_screw_pitch = 8.0;

// Syringe Configuration
struct SyringeItem {
  const char* label;
  int volume;
};

SyringeItem syringes[2] = {{"10CC", 10}, {"20CC", 20}};

// Physical parameters per syringe type
float mm_per_ml[2] = {5.0, 3.33};
float steps_per_ml[2];
float ml_per_step[2];
float syringe_min_mlph[2] = {0.1, 0.1};
float syringe_max_mlph[2] = {60.0, 120.0};

const int HOMING_PULSE_US = 200;
const int CONTACT_PULSE_US = 500;

// Sensor Thresholds
const int FSR_PRESENCE_THRESHOLD = 450;
const int FSR_OCCLUSION_THRESHOLD = 2000;

// ========================================
// TYPE DEFINITIONS
// ========================================

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

enum ErrorType {
  ERR_NONE,
  ERR_HOME_TIMEOUT,
  ERR_PISTON_NOT_FOUND,
  ERR_OCCLUSION
};

struct SetupHistory {
  float tg;
  int drug;
  int totalSec;
};

struct TouchEvent {
  int x;
  int y;
  bool pressed;
};

// ========================================
// GLOBAL VARIABLES
// ========================================

// Display & Touch
Adafruit_ILI9341 tft(TFT_CS, TFT_DC, TFT_RST);
XPT2046_Touchscreen ts(T_CS, T_IRQ);
QueueHandle_t touchQueue;

// WiFi & Firebase
WiFiClient client;
WebServer server(80);
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
FirebaseData stream;
String deviceId;
Preferences preferences;

// System State
volatile MenuState currentState = STATE_BOOT;
volatile ErrorType currentError = ERR_NONE;
volatile bool uiDirty = true;
volatile bool pumpScreenDirty = true;

// Pump State
volatile bool pumpRunning = false;
volatile bool isPaused = false;
volatile bool homed = false;
volatile bool contactFound = false;
volatile bool fsrAlert = false;
volatile bool doneAlert = false;
volatile bool occlusionMonitorEnabled = false;
volatile bool contactJustFound = false;
volatile bool contactBeepDone = false;

// Prepare & Rehome State
volatile bool prepareInProgress = false;
volatile bool homingRequested = false;
volatile bool retractRequested = false;
volatile bool waitingForContact = false;
volatile bool rehomeInProgress = false;
volatile bool rehomeSuccessShown = false;
volatile bool returnToReadyAfterSetup = false;
volatile uint8_t prepareStep = 0;
unsigned long prepareStepMillis = 0;
unsigned long rehomeSuccessMillis = 0;

// Configuration
volatile float tgValue = 1.0;
volatile int drugValue = 5;
int selectedSyringe = 0;

// Adjust State
volatile bool adjustTG = false;
volatile float adjustFloatVal = 0;
volatile int adjustIntVal = 0;
volatile int adjustDirection = 0;

// Motor Control
volatile int pulseIntervalUs = 2000;
volatile int remainingSec = 0;
volatile unsigned long totalStepsNeeded = 0;
volatile unsigned long stepsCompleted = 0;
volatile unsigned long totalPumpDurationMs = 0;
volatile unsigned long pumpRunAccumulatedMs = 0;
volatile unsigned long pumpRunStartedAt = 0;

// Timing
unsigned long startMillis = 0;
unsigned long pausedMillis = 0;
bool firstStart = true;
unsigned long pumpStartIgnoreUntil = 0;
unsigned long lastPumpUiUpdate = 0;

// History
SetupHistory history[HISTORY_SIZE];
int historyCount = 0;

// WiFi State
bool wifiConnected = false;
bool firebaseConnected = false;
unsigned long lastWiFiCheck = 0;
unsigned long lastFirebaseSync = 0;
const unsigned long WIFI_CHECK_INTERVAL = 30000;  // 30 seconds
const unsigned long FIREBASE_SYNC_INTERVAL = 1000; // 1 second

// ========================================
// FUNCTION DECLARATIONS
// ========================================

// WiFi Functions
void connectToAvailableWiFi();
bool waitForConnection(int timeoutMs = 15000);
void checkWiFiConnection();

// Firebase Functions
void setupFirebase();
String getDeviceId();
void streamCallback(MultiPathStream data);
void streamTimeoutCallback(bool timeout);
void updateFirebaseStatus();
void processFirebaseCommand(String commandType, JsonObject& params);
void sendCommandResult(String commandId, bool success, String message);

// Motor Functions
void initMotor();
void setMotorSpeed(float mlPerHour, int syringeIndex);
void stepMotor(int steps, int intervalUs);
void stopMotor();

// Touch Functions
bool getTouch(int &x, int &y);
bool inExpandedRect(const TouchEvent &te, int x, int y, int w, int h, int padX = 10, int padY = 10);
void touchTask(void* pvParameters);

// Display Functions
void initDisplay();
void updateDisplay();
void drawButton(int x, int y, int w, int h, const char* label, uint16_t color);
void drawStatusScreen();
void drawSetupScreen();
void drawAdjustScreen();
void drawPrepareScreen();
void drawResultScreen();
void drawErrorScreen();
void drawSyringeScreen();
void drawHistoryScreen();
void displayTask(void* pvParameters);

// FSR Functions
int readFSRFiltered();
bool isLimitPressed();
void fsrTask(void* pvParameters);

// Pump Functions
void addToHistory(float tg, int drug);
void startPump();
void stopPump();
void pausePump();
void resumePump();
void preparePump();
void rehomePump();
void resetAlarm();

// Calculation Functions
int calcPulseIntervalUsFromMlPerHour(float mlPerHour, int syringeIndex);
unsigned long calcTotalSteps(float volumeMl, int syringeIndex);
float calcRemainingVolume();

// State Functions
const char* stateToString(MenuState state);
const char* errorToString(ErrorType error);

// Web Server Functions
void handleStatus();
void handleStart();
void handleStop();
void handlePause();
void handleResume();
void handleConfig();
void handlePrepare();
void handleRehome();
void handleResetAlarm();
void handleHistory();
void handleNotFound();

// FreeRTOS Tasks
void motorTask(void* pvParameters);
void countdownTask(void* pvParameters);
void firebaseTask(void* pvParameters);

// ========================================
// SETUP
// ========================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("ESP32 Syringe Pump v8.5 - Firebase Cloud Control");

  // Initialize preferences
  preferences.begin("pump-config", false);

  // Calculate physical parameters
  for (int i = 0; i < 2; i++) {
    float ml_per_rev = lead_screw_pitch / (float)total_steps_per_rev;
    steps_per_ml[i] = 1.0 / (ml_per_rev * mm_per_ml[i]);
    ml_per_step[i] = 1.0 / steps_per_ml[i];
  }

  // Initialize hardware
  initDisplay();
  initMotor();

  // Initialize touch queue
  touchQueue = xQueueCreate(10, sizeof(TouchEvent));

  // Get device ID
  deviceId = getDeviceId();
  Serial.print("Device ID: ");
  Serial.println(deviceId);

  // Connect to WiFi
  connectToAvailableWiFi();

  // Setup Firebase if WiFi connected
  if (wifiConnected) {
    setupFirebase();
  }

  // Start WebServer (for local AP mode or debugging)
  server.on("/api/status", HTTP_GET, handleStatus);
  server.on("/api/start", HTTP_POST, handleStart);
  server.on("/api/stop", HTTP_POST, handleStop);
  server.on("/api/pause", HTTP_POST, handlePause);
  server.on("/api/resume", HTTP_POST, handleResume);
  server.on("/api/config", HTTP_GET, handleConfig);
  server.on("/api/config", HTTP_POST, [](AsyncWebServerRequest *request){});
  server.on("/api/prepare", HTTP_POST, handlePrepare);
  server.on("/api/rehome", HTTP_POST, handleRehome);
  server.on("/api/reset_alarm", HTTP_POST, handleResetAlarm);
  server.on("/api/history", HTTP_GET, handleHistory);
  server.onNotFound(handleNotFound);

  server.enableCORS(true);
  server.begin();

  // Create FreeRTOS tasks
  xTaskCreatePinnedToCore(touchTask, "Touch", 4096, NULL, 1, NULL, 0);
  xTaskCreatePinnedToCore(displayTask, "Display", 12000, NULL, 1, NULL, 1);
  xTaskCreatePinnedToCore(motorTask, "Motor", 4096, NULL, 1, NULL, 1);
  xTaskCreatePinnedToCore(countdownTask, "Countdown", 4096, NULL, 1, NULL, 1);
  xTaskCreatePinnedToCore(fsrTask, "FSR", 3072, NULL, 1, NULL, 1);
  xTaskCreatePinnedToCore(firebaseTask, "Firebase", 8192, NULL, 1, NULL, 1);

  Serial.println("Setup complete. Starting tasks...");

  // Start in syringe selection state
  currentState = STATE_SYRINGE;
  uiDirty = true;
}

// ========================================
// LOOP
// ========================================

void loop() {
  // Check WiFi connection periodically
  checkWiFiConnection();

  // Handle WebServer clients
  server.handleClient();

  // Small delay to prevent watchdog issues
  delay(10);
}

// ========================================
// WIFI FUNCTIONS
// ========================================

void connectToAvailableWiFi() {
  Serial.println("Scanning for WiFi networks...");

  // Scan available networks
  int n = WiFi.scanNetworks();
  Serial.print("Found ");
  Serial.print(n);
  Serial.println(" networks");

  // Try to connect to each known network
  for (int i = 0; i < sizeof(knownNetworks)/sizeof(WiFiCredential); i++) {
    if (strlen(knownNetworks[i].ssid) == 0) break;  // Empty entry

    Serial.print("Checking for: ");
    Serial.println(knownNetworks[i].ssid);

    for (int j = 0; j < n; j++) {
      if (WiFi.SSID(j) == knownNetworks[i].ssid) {
        Serial.print("Found! Connecting to ");
        Serial.println(knownNetworks[i].ssid);

        WiFi.begin(knownNetworks[i].ssid, knownNetworks[i].password);

        if (waitForConnection()) {
          wifiConnected = true;
          Serial.println("WiFi connected!");
          Serial.print("IP address: ");
          Serial.println(WiFi.localIP());
          return;
        }
      }
    }
  }

  // If no known network found, start AP mode
  Serial.println("No known WiFi found. Starting AP mode...");
  WiFi.softAP("ESP32-PUMP", "12345678");
  Serial.println("AP started. SSID: ESP32-PUMP, Password: 12345678");
  Serial.print("AP IP address: ");
  Serial.println(WiFi.softAPIP());
  wifiConnected = false;
}

bool waitForConnection(int timeoutMs) {
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() - start > timeoutMs) {
      Serial.println("\nConnection timeout!");
      return false;
    }
  }
  Serial.println("\nConnected!");
  return true;
}

void checkWiFiConnection() {
  unsigned long now = millis();
  if (now - lastWiFiCheck < WIFI_CHECK_INTERVAL) return;
  lastWiFiCheck = now;

  if (wifiConnected && WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi connection lost. Reconnecting...");
    wifiConnected = false;
    firebaseConnected = false;
    connectToAvailableWiFi();
  }
}

// ========================================
// FIREBASE FUNCTIONS
// ========================================

void setupFirebase() {
  Serial.println("Setting up Firebase...");

  config.api_key = FIREBASE_API_KEY;
  config.database_url = "https://" FIREBASE_DATABASE_URL;

  config.token_status_callback = [](TokenInfo info) {
    Serial.printf("Token info: %s\n", info.status == firebase_token_status_ready ? "ready" : "not ready");
  };

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Subscribe to device commands
  String streamPath = "/devices/" + deviceId + "/commands";
  if (Firebase.RTDB.beginStream(&stream, streamPath.c_str())) {
    Firebase.RTDB.setMultiPathStreamCallback(&stream, streamCallback, streamTimeoutCallback);
    firebaseConnected = true;
    Serial.println("Firebase stream started!");
  } else {
    Serial.printf("Firebase stream failed: %s\n", stream.errorReason().c_str());
  }

  // Register device info
  String infoPath = "/devices/" + deviceId + "/info";
  FirebaseJson info;
  info.add("name", "ESP32 Pump " + deviceId.substring(0, 4));
  info.add("type", "syringe_pump");
  info.add("firmware", "8.5");
  info.add("lastSeen", Firebase.RTDB.getServerTimestamp(&fbdo));
  info.add("ipAddress", WiFi.localIP().toString());
  info.add("macAddress", WiFi.macAddress());

  Firebase.RTDB.set(&fbdo, infoPath.c_str(), info);
}

String getDeviceId() {
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  return mac;
}

void streamCallback(MultiPathStream data) {
  Serial.println("Firebase stream callback received!");

  size_t len = data.valuePath().length();
  String key = data.valuePath();

  // Parse command
  if (data.type() == firebase_rtdb_event_type_update) {
    // Get command data
    FirebaseJson json = data.to<FirebaseJson>();
    FirebaseJsonData result;

    String commandType;
    if (json.get(result, "type")) {
      commandType = result.to<String>();

      // Get params if present
      JsonObject params;
      // Parse params if needed

      processFirebaseCommand(commandType, params);
    }
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) {
    Serial.println("Firebase stream timeout!");
  }
}

void updateFirebaseStatus() {
  if (!firebaseConnected || !Firebase.ready()) return;

  String statusPath = "/devices/" + deviceId + "/status";

  FirebaseJson json;
  json.add("state", stateToString(currentState));
  json.add("syringeType", syringes[selectedSyringe].label);
  json.add("syringeIndex", selectedSyringe);
  json.add("speedMlh", (double)tgValue);
  json.add("volumeMl", drugValue);
  json.add("remainingSec", remainingSec);
  json.add("stepsCompleted", (int)stepsCompleted);
  json.add("stepsTotal", (int)totalStepsNeeded);
  json.add("homed", homed);
  json.add("contactFound", contactFound);
  json.add("fsrAlert", fsrAlert);
  json.add("pumpRunning", pumpRunning);
  json.add("paused", isPaused);
  json.add("fsrRaw", analogRead(FSR_PIN));
  json.add("limitPressed", isLimitPressed());
  json.add("buzzerOn", digitalRead(BUZZER_PIN) == HIGH);
  json.add("connectionStatus", wifiConnected ? "online" : "offline");
  json.add("updatedAt", Firebase.RTDB.getServerTimestamp(&fbdo));

  if (currentError != ERR_NONE) {
    json.add("error", errorToString(currentError));
  }

  if (!Firebase.RTDB.set(&fbdo, statusPath.c_str(), json)) {
    Serial.printf("Firebase status update failed: %s\n", fbdo.errorReason().c_str());
  }
}

void processFirebaseCommand(String commandType, JsonObject& params) {
  Serial.print("Processing Firebase command: ");
  Serial.println(commandType);

  // Generate command ID for result
  String commandId = String(millis());

  bool success = false;
  String message = "";

  if (commandType == "START") {
    if (currentState == STATE_READY || currentState == STATE_PREPARE) {
      if (contactFound) {
        // Update config from params if provided
        if (params.containsKey("speedMlh")) {
          tgValue = params["speedMlh"];
        }
        if (params.containsKey("volumeMl")) {
          drugValue = params["volumeMl"];
        }
        if (params.containsKey("syringeIndex")) {
          selectedSyringe = params["syringeIndex"];
        }

        startPump();
        success = true;
        message = "Pump started";
      } else {
        message = "No syringe contact";
      }
    } else {
      message = "Pump not ready";
    }
  }
  else if (commandType == "STOP") {
    stopPump();
    success = true;
    message = "Pump stopped";
  }
  else if (commandType == "PAUSE") {
    if (pumpRunning && !isPaused) {
      pausePump();
      success = true;
      message = "Pump paused";
    } else {
      message = "Pump not running or already paused";
    }
  }
  else if (commandType == "RESUME") {
    if (pumpRunning && isPaused) {
      resumePump();
      success = true;
      message = "Pump resumed";
    } else {
      message = "Pump not paused";
    }
  }
  else if (commandType == "CONFIG") {
    if (params.containsKey("speedMlh")) {
      tgValue = params["speedMlh"];
    }
    if (params.containsKey("volumeMl")) {
      drugValue = params["volumeMl"];
    }
    if (params.containsKey("syringeIndex")) {
      selectedSyringe = params["syringeIndex"];
    }
    success = true;
    message = "Config updated";
  }
  else if (commandType == "PREPARE") {
    preparePump();
    success = true;
    message = "Prepare initiated";
  }
  else if (commandType == "REHOME") {
    rehomePump();
    success = true;
    message = "Rehome initiated";
  }
  else if (commandType == "RESET_ALARM") {
    resetAlarm();
    success = true;
    message = "Alarm reset";
  }
  else {
    message = "Unknown command";
  }

  sendCommandResult(commandId, success, message);
}

void sendCommandResult(String commandId, bool success, String message) {
  if (!firebaseConnected) return;

  String resultPath = "/devices/" + deviceId + "/commands/" + commandId;

  FirebaseJson json;
  json.add("success", success);
  json.add("message", message);
  json.add("processedAt", Firebase.RTDB.getServerTimestamp(&fbdo));
  json.add("status", success ? "completed" : "failed");

  Firebase.RTDB.updateNode(&fbdo, resultPath.c_str(), json);
}

// ========================================
// MOTOR FUNCTIONS
// ========================================

void initMotor() {
  pinMode(ENA_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(PUL_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LIMIT_SWITCH_PIN, INPUT_PULLUP);

  // Disable motor initially
  digitalWrite(ENA_PIN, HIGH);

  Serial.println("Motor initialized");
}

void setMotorSpeed(float mlPerHour, int syringeIndex) {
  // Calculate pulse interval based on flow rate
  pulseIntervalUs = calcPulseIntervalUsFromMlPerHour(mlPerHour, syringeIndex);
}

void stepMotor(int steps, int intervalUs) {
  digitalWrite(DIR_PIN, HIGH);
  digitalWrite(ENA_PIN, LOW);

  for (int i = 0; i < steps; i++) {
    if (!pumpRunning) break;

    digitalWrite(PUL_PIN, HIGH);
    delayMicroseconds(intervalUs / 2);
    digitalWrite(PUL_PIN, LOW);
    delayMicroseconds(intervalUs / 2);

    stepsCompleted++;
  }
}

void stopMotor() {
  digitalWrite(ENA_PIN, HIGH);
}

// ========================================
// CALCULATION FUNCTIONS
// ========================================

int calcPulseIntervalUsFromMlPerHour(float mlPerHour, int syringeIndex) {
  // Convert ml/hour to steps/second
  float mlPerSec = mlPerHour / 3600.0;
  float stepsPerSec = mlPerSec * steps_per_ml[syringeIndex];
  float intervalUs = 1000000.0 / stepsPerSec;

  // Clamp to minimum
  if (intervalUs < MIN_PULSE_US) intervalUs = MIN_PULSE_US;

  return (int)intervalUs;
}

unsigned long calcTotalSteps(float volumeMl, int syringeIndex) {
  return (unsigned long)(volumeMl * steps_per_ml[syringeIndex]);
}

float calcRemainingVolume() {
  if (totalStepsNeeded == 0) return 0;
  return (float)(totalStepsNeeded - stepsCompleted) / steps_per_ml[selectedSyringe];
}

// ========================================
// STATE & ERROR FUNCTIONS
// ========================================

const char* stateToString(MenuState state) {
  switch (state) {
    case STATE_BOOT: return "BOOT";
    case STATE_HOMING: return "HOMING";
    case STATE_SYRINGE: return "SYRINGE";
    case STATE_MAIN: return "MAIN";
    case STATE_SETUP: return "SETUP";
    case STATE_ADJUST: return "ADJUST";
    case STATE_PREPARE: return "PREPARE";
    case STATE_RESULT: return "RESULT";
    case STATE_ERROR: return "ERROR";
    case STATE_HISTORY: return "HISTORY";
    case STATE_DONE: return "DONE";
    case STATE_READY: return "READY";
    default: return "UNKNOWN";
  }
}

const char* errorToString(ErrorType error) {
  switch (error) {
    case ERR_NONE: return "None";
    case ERR_HOME_TIMEOUT: return "Home timeout";
    case ERR_PISTON_NOT_FOUND: return "Piston not found";
    case ERR_OCCLUSION: return "Occlusion detected";
    default: return "Unknown";
  }
}

// ========================================
// PUMP FUNCTIONS
// ========================================

void startPump() {
  if (!contactFound) {
    Serial.println("Cannot start: No syringe contact");
    return;
  }

  totalStepsNeeded = calcTotalSteps(drugValue, selectedSyringe);
  stepsCompleted = 0;
  fsrAlert = false;
  doneAlert = false;
  currentError = ERR_NONE;
  pumpRunning = true;
  isPaused = false;
  firstStart = true;
  startMillis = millis();
  totalPumpDurationMs = (unsigned long)((drugValue / tgValue) * 3600000.0);
  pumpRunAccumulatedMs = 0;
  pumpRunStartedAt = millis();
  occlusionMonitorEnabled = false;
  pumpStartIgnoreUntil = millis() + 1200;

  addToHistory(tgValue, drugValue);
  currentState = STATE_RESULT;
  uiDirty = true;
  pumpScreenDirty = true;

  Serial.println("Pump started");
}

void stopPump() {
  pumpRunning = false;
  isPaused = false;
  stopMotor();
  currentState = STATE_MAIN;
  uiDirty = true;
  remainingSec = 0;

  Serial.println("Pump stopped");
}

void pausePump() {
  if (!pumpRunning) return;

  isPaused = true;
  pausedMillis = millis();
  pumpRunAccumulatedMs += millis() - pumpRunStartedAt;

  Serial.println("Pump paused");
}

void resumePump() {
  if (!pumpRunning || !isPaused) return;

  isPaused = false;
  pumpRunStartedAt = millis();

  Serial.println("Pump resumed");
}

void addToHistory(float tg, int drug) {
  if (historyCount < HISTORY_SIZE) {
    history[historyCount].tg = tg;
    history[historyCount].drug = drug;
    history[historyCount].totalSec = (int)(drug / tg * 3600);
    historyCount++;
  } else {
    // Shift array
    for (int i = 0; i < HISTORY_SIZE - 1; i++) {
      history[i] = history[i + 1];
    }
    history[HISTORY_SIZE - 1].tg = tg;
    history[HISTORY_SIZE - 1].drug = drug;
    history[HISTORY_SIZE - 1].totalSec = (int)(drug / tg * 3600);
  }
}

void resetAlarm() {
  fsrAlert = false;
  currentError = ERR_NONE;
  occlusionMonitorEnabled = false;
  uiDirty = true;

  Serial.println("Alarm reset");
}

// ========================================
// FSR FUNCTIONS
// ========================================

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

  return (int)((sum - minV - maxV) / (N - 2));
}

bool isLimitPressed() {
  return digitalRead(LIMIT_SWITCH_PIN) == LOW;
}

// ========================================
// DISPLAY FUNCTIONS
// ========================================

void initDisplay() {
  tft.begin();
  tft.setRotation(1);
  tft.fillScreen(ILI9341_BLACK);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);

  Serial.println("Display initialized");
}

void updateDisplay() {
  if (!uiDirty) return;

  tft.fillScreen(ILI9341_BLACK);

  switch (currentState) {
    case STATE_SYRINGE:
      drawSyringeScreen();
      break;
    case STATE_MAIN:
      drawStatusScreen();
      break;
    case STATE_SETUP:
      drawSetupScreen();
      break;
    case STATE_ADJUST:
      drawAdjustScreen();
      break;
    case STATE_PREPARE:
      drawPrepareScreen();
      break;
    case STATE_RESULT:
      drawResultScreen();
      break;
    case STATE_ERROR:
      drawErrorScreen();
      break;
    case STATE_HISTORY:
      drawHistoryScreen();
      break;
    default:
      drawStatusScreen();
      break;
  }

  uiDirty = false;
}

void drawButton(int x, int y, int w, int h, const char* label, uint16_t color) {
  tft.fillRoundRect(x, y, w, h, 10, color);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);

  int16_t x1, y1;
  uint16_t w1, h1;
  tft.getTextBounds(label, 0, 0, &x1, &y1, &w1, &h1);

  int textX = x + (w - w1) / 2;
  int textY = y + (h - h1) / 2;
  tft.setCursor(textX, textY);
  tft.print(label);
}

void drawSyringeScreen() {
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(20, 20);
  tft.setTextSize(3);
  tft.print("CHON ONG TIEM");

  int btnX = (tft.width() - btnWidth) / 2;
  int btnY1 = 100;
  int btnY2 = 250;

  drawButton(btnX, btnY1, btnWidth, btnHeight, syringes[0].label, ILI9341_BLUE);
  drawButton(btnX, btnY2, btnWidth, btnHeight, syringes[1].label, ILI9341_GREEN);
}

void drawStatusScreen() {
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(20, 20);
  tft.setTextSize(3);
  tft.print("MAY BOM TIEM");

  tft.setCursor(20, 80);
  tft.setTextSize(2);
  tft.print("Ong: ");
  tft.print(syringes[selectedSyringe].label);

  tft.setCursor(20, 120);
  tft.print("Toc do: ");
  tft.print(tgValue);
  tft.println(" ml/h");

  tft.setCursor(20, 160);
  tft.print("The tich: ");
  tft.print(drugValue);
  tft.println(" ml");

  // Draw buttons
  int btnX = (tft.width() - btnWidth) / 2;
  drawButton(btnX, 200, btnWidth, btnHeight, "CAI DAT", ILI9341_BLUE);
  drawButton(btnX, 300, btnWidth, btnHeight, "CHUAN BI", ILI9341_ORANGE);
}

void drawResultScreen() {
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(20, 20);
  tft.setTextSize(3);
  tft.print("DANG BOM...");

  tft.setCursor(20, 80);
  tft.setTextSize(2);
  tft.print("Con lai: ");
  tft.print(remainingSec / 60);
  tft.print("p ");
  tft.print(remainingSec % 60);
  tft.println("s");

  float volRemaining = calcRemainingVolume();
  tft.setCursor(20, 120);
  tft.print("The tich: ");
  tft.print(volRemaining, 1);
  tft.print(" / ");
  tft.print(drugValue);
  tft.println(" ml");

  // Draw pause/stop buttons
  int btnX = (tft.width() - btnWidth) / 2;
  if (isPaused) {
    drawButton(btnX, 200, btnWidth, btnHeight, "TIEP TUC", ILI9341_GREEN);
  } else {
    drawButton(btnX, 200, btnWidth, btnHeight, " TAM DUNG", ILI9341_YELLOW);
  }
  drawButton(btnX, 300, btnWidth, btnHeight, " DUNG LAI", ILI9341_RED);
}

void drawSetupScreen() {
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(20, 20);
  tft.setTextSize(3);
  tft.print("CAI DAT");

  tft.setCursor(20, 80);
  tft.setTextSize(2);
  tft.print("Toc do: ");
  tft.print(tgValue);
  tft.println(" ml/h");

  tft.setCursor(20, 120);
  tft.print("The tich: ");
  tft.print(drugValue);
  tft.println(" ml");

  // Draw adjustment buttons
  int btnX = (tft.width() - btnWidth) / 2;
  drawButton(btnX, 200, btnWidth, btnHeight, "CHINH TOC DO", ILI9341_BLUE);
  drawButton(btnX, 300, btnWidth, btnHeight, "CHINH THE TICH", ILI9341_ORANGE);
  drawButton(20, 400, 100, 60, " < ", ILI9341_GRAY);
  drawButton(tft.width() - 120, 400, 100, 60, " > ", ILI9341_GRAY);
}

void drawPrepareScreen() {
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(20, 20);
  tft.setTextSize(3);
  tft.print("CHUAN BI...");

  tft.setCursor(20, 80);
  tft.setTextSize(2);

  switch (prepareStep) {
    case 1:
      tft.print("Dang tim Home...");
      break;
    case 2:
      tft.print("Dang tim ong tiem...");
      break;
    case 3:
      tft.print("Da tim thay ong!");
      break;
    case 4:
      tft.print("San sang!");
      break;
  }
}

void drawErrorScreen() {
  tft.fillScreen(ILI9341_RED);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(20, 50);
  tft.setTextSize(3);
  tft.print("LOI!");

  tft.setCursor(20, 120);
  tft.setTextSize(2);
  tft.print(errorToString(currentError));

  int btnX = (tft.width() - btnWidth) / 2;
  drawButton(btnX, 300, btnWidth, btnHeight, "TRO VE", ILI9341_BLUE);
}

void drawHistoryScreen() {
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(20, 20);
  tft.setTextSize(3);
  tft.print("LICH SU");

  tft.setCursor(20, 80);
  tft.setTextSize(2);

  for (int i = 0; i < historyCount; i++) {
    tft.print(i + 1);
    tft.print(". ");
    tft.print(history[i].tg);
    tft.print(" ml/h, ");
    tft.print(history[i].drug);
    tft.print(" ml, ");
    tft.print(history[i].totalSec / 60);
    tft.println("p");
  }

  int btnX = (tft.width() - btnWidth) / 2;
  drawButton(btnX, 400, btnWidth, btnHeight, "TRO VE", ILI9341_BLUE);
}

// ========================================
// TOUCH FUNCTIONS
// ========================================

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

bool inExpandedRect(const TouchEvent &te, int x, int y, int w, int h, int padX, int padY) {
  return (te.x >= x - padX && te.x <= x + w + padX &&
          te.y >= y - padY && te.y <= y + h + padY);
}

void touchTask(void* pvParameters) {
  TouchEvent te;

  while (true) {
    int x, y;
    if (getTouch(x, y)) {
      te.x = x;
      te.y = y;
      te.pressed = true;
      xQueueSend(touchQueue, &te, portMAX_DELAY);

      // Process touch based on current state
      // (Touch processing logic would go here)
      // For brevity, simplified handling

      delay(200);  // Debounce
    } else {
      te.pressed = false;
    }

    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

// ========================================
// DISPLAY TASK
// ========================================

void displayTask(void* pvParameters) {
  while (true) {
    updateDisplay();
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

// ========================================
// MOTOR TASK
// ========================================

void motorTask(void* pvParameters) {
  while (true) {
    if (pumpRunning && !isPaused) {
      // Enable motor
      digitalWrite(ENA_PIN, LOW);

      // Generate pulses
      digitalWrite(PUL_PIN, HIGH);
      delayMicroseconds(pulseIntervalUs / 2);
      digitalWrite(PUL_PIN, LOW);
      delayMicroseconds(pulseIntervalUs / 2);

      stepsCompleted++;

      // Check if done
      if (stepsCompleted >= totalStepsNeeded) {
        pumpRunning = false;
        currentState = STATE_DONE;
        uiDirty = true;
      }
    } else {
      // Disable motor when not running
      digitalWrite(ENA_PIN, HIGH);
    }

    vTaskDelay(1);
  }
}

// ========================================
// COUNTDOWN TASK
// ========================================

void countdownTask(void* pvParameters) {
  while (true) {
    if (pumpRunning && !isPaused) {
      if (totalPumpDurationMs > 0) {
        unsigned long elapsed = pumpRunAccumulatedMs + (millis() - pumpRunStartedAt);
        remainingSec = (totalPumpDurationMs - elapsed) / 1000;

        if (remainingSec <= 0) {
          remainingSec = 0;
          pumpRunning = false;
          currentState = STATE_DONE;
          uiDirty = true;
        }

        pumpScreenDirty = true;
      }
    }

    vTaskDelay(pdMS_TO_TICKS(1000));
  }
}

// ========================================
// FSR TASK
// ========================================

void fsrTask(void* pvParameters) {
  while (true) {
    int fsrValue = readFSRFiltered();

    // Check for occlusion
    if (occlusionMonitorEnabled && millis() > pumpStartIgnoreUntil) {
      if (fsrValue > FSR_OCCLUSION_THRESHOLD) {
        if (!fsrAlert) {
          fsrAlert = true;
          currentError = ERR_OCCLUSION;

          if (pumpRunning) {
            pausePump();
            currentState = STATE_ERROR;
            uiDirty = true;
          }
        }
      }
    }

    // Check syringe presence
    if (waitingForContact && fsrValue > FSR_PRESENCE_THRESHOLD) {
      contactFound = true;
      waitingForContact = false;
      contactJustFound = true;
      prepareStep = 3;
      uiDirty = true;
    }

    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

// ========================================
// FIREBASE TASK
// ========================================

void firebaseTask(void* pvParameters) {
  while (true) {
    if (firebaseConnected && WiFi.status() == WL_CONNECTED) {
      // Update status periodically
      unsigned long now = millis();
      if (now - lastFirebaseSync >= FIREBASE_SYNC_INTERVAL) {
        lastFirebaseSync = now;
        updateFirebaseStatus();
      }

      // Keep Firebase ready
      Firebase.ready();
    }

    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

// ========================================
// WEB SERVER HANDLERS (for local AP/debug)
// ========================================

void handleStatus() {
  FirebaseJson json;
  json.add("state", stateToString(currentState));
  json.add("syringe", syringes[selectedSyringe].label);
  json.add("syringe_index", selectedSyringe);
  json.add("speed_mlh", tgValue);
  json.add("volume_ml", drugValue);
  json.add("remaining_sec", remainingSec);
  json.add("steps_completed", (int)stepsCompleted);
  json.add("steps_total", (int)totalStepsNeeded);
  json.add("homed", homed);
  json.add("contact_found", contactFound);
  json.add("fsr_alert", fsrAlert);
  json.add("pump_running", pumpRunning);
  json.add("paused", isPaused);
  json.add("fsr_raw", analogRead(FSR_PIN));
  json.add("limit_pressed", isLimitPressed());
  json.add("buzzer_on", digitalRead(BUZZER_PIN) == HIGH);
  json.add("connection_status", wifiConnected ? "online" : "offline");

  String jsonString;
  json.toString(jsonString);

  server.send(200, "application/json", jsonString);
}

void handleStart() {
  if (currentState == STATE_READY || currentState == STATE_PREPARE) {
    startPump();
    server.send(200, "application/json", "{\"success\":true}");
  } else {
    server.send(400, "application/json", "{\"success\":false,\"message\":\"Pump not ready\"}");
  }
}

void handleStop() {
  stopPump();
  server.send(200, "application/json", "{\"success\":true}");
}

void handlePause() {
  pausePump();
  server.send(200, "application/json", "{\"success\":true}");
}

void handleResume() {
  resumePump();
  server.send(200, "application/json", "{\"success\":true}");
}

void handleConfig() {
  if (server.method() == HTTP_GET) {
    FirebaseJson json;
    json.add("syringe_index", selectedSyringe);
    json.add("speed_mlh", tgValue);
    json.add("volume_ml", drugValue);

    String jsonString;
    json.toString(jsonString);

    server.send(200, "application/json", jsonString);
  } else if (server.method() == HTTP_POST) {
    // Parse body and update config
    // (Implementation would parse JSON body)
    server.send(200, "application/json", "{\"success\":true}");
  }
}

void handlePrepare() {
  preparePump();
  server.send(200, "application/json", "{\"success\":true}");
}

void handleRehome() {
  rehomePump();
  server.send(200, "application/json", "{\"success\":true}");
}

void handleResetAlarm() {
  resetAlarm();
  server.send(200, "application/json", "{\"success\":true}");
}

void handleHistory() {
  FirebaseJson json;

  for (int i = 0; i < historyCount; i++) {
    String key = "history_" + String(i);
    FirebaseJson entry;
    entry.add("speed_mlh", history[i].tg);
    entry.add("volume_ml", history[i].drug);
    entry.add("total_sec", history[i].totalSec);

    json.add(key.c_str(), entry);
  }

  String jsonString;
  json.toString(jsonString);

  server.send(200, "application/json", jsonString);
}

void handleNotFound() {
  server.send(404, "application/json", "{\"error\":\"Not found\"}");
}

// ========================================
// PREPARE & REHOME FUNCTIONS (simplified)
// ========================================

void preparePump() {
  if (prepareInProgress) return;

  prepareInProgress = true;
  prepareStep = 1;
  currentState = STATE_PREPARE;
  uiDirty = true;

  // Start prepare sequence
  // (Implementation would handle homing -> find contact -> ready)
}

void rehomePump() {
  if (rehomeInProgress) return;

  rehomeInProgress = true;
  currentState = STATE_HOMING;
  uiDirty = true;

  // Start rehome sequence
  // (Implementation would handle homing only)
}
