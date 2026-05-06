# ESP32 Syringe Pump Firmware

ESP32 firmware for syringe pump control with WiFi and Firebase integration.

## Files

### 8_4_webok.ino
- **Mode**: AP (Access Point) only
- **WiFi**: Creates "ESP32-PUMP" network
- **Use Case**: Local control when same WiFi network
- **Backup**: Original working firmware

### 8_5_firebase_sta.ino (Coming Soon)
- **Mode**: STA (Station) + Firebase Realtime Database
- **WiFi**: Auto-connects to available networks
- **Use Case**: Remote control from anywhere via Firebase
- **Features**: Cloud-based commands, real-time status sync

## How to Upload

### Using Arduino IDE
1. Open Arduino IDE
2. Load `.ino` file
3. Select Board: ESP32 Dev Module
4. Select Port: (ESP32 connected port)
5. Click Upload

### Using PlatformIO
```bash
cd esp32-firmware
pio run --target upload
```

## Configuration

### WiFi Credentials (for 8_5_firebase_sta.ino)
Edit the `knownNetworks` array in the firmware:
```cpp
WiFiCredential knownNetworks[] = {
  {"YourWiFiName", "YourPassword"},
  // Add more networks as needed
};
```

### Firebase Configuration
Edit these values in the firmware:
- API Key
- Project ID
- Database URL

Get these from: Firebase Console → Project Settings → General

## Pin Configuration

| Component | Pin |
|-----------|-----|
| Stepper ENA | D25 |
| Stepper DIR | D26 |
| Stepper PUL | D27 |
| FSR Sensor | A0 |
| Limit Switch | D22 |
| Buzzer | D23 |
| TFT SCK | D18 |
| TFT MOSI | D19 |
| TFT DC | D5 |
| TFT CS | D21 |
| TFT RESET | D33 |
| Touch INT | D34 |

## Safety Features

- FSR occlusion detection (auto-stop on blockage)
- Limit switch homing
- Emergency stop capability
- Position tracking and validation

## Troubleshooting

**ESP32 won't connect to WiFi**:
- Check SSID and password are correct
- Verify WiFi is within range
- Try resetting ESP32

**Firebase connection fails**:
- Check API key and database URL
- Verify Realtime Database is created
- Check security rules allow access

**Motor not moving**:
- Check stepper driver connections
- Verify ENA pin is LOW (enabled)
- Check power supply (12V recommended)
