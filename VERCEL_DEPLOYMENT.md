# Vercel Deployment Guide

## Firebase Realtime Database Setup (Required)

Before deploying to Vercel, you must create the Realtime Database in Firebase:

### Step 1: Create Realtime Database
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select project: `esp32-firebase-2026`
3. Click "Realtime Database" in left sidebar
4. Click "Create Database"
5. Select location: `nam5` (same as Firestore)
6. Start in **Test Mode** (allows read/write for 30 days)

### Step 2: Deploy Security Rules
```bash
firebase database:deploy --project esp32-firebase-2026 --rules firebase-config/database.rules.json
```

Or manually in Firebase Console:
1. Realtime Database → Rules
2. Copy content from `firebase-config/database.rules.json`
3. Click Publish

### Step 3: Get Database URL
The database URL is:
```
https://esp32-firebase-2026-default-rtdb.firebaseio.com/
```

## Vercel Environment Variables

Go to Vercel Dashboard → Project → Settings → Environment Variables

Add these variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC9XlTugbmJPh77YymSFNNPf8UORHJi2qw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=esp32-firebase-2026.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=esp32-firebase-2026
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=esp32-firebase-2026.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=173601455015
NEXT_PUBLIC_FIREBASE_APP_ID=1:173601455015:web:45c12915ffe835300cd482
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://esp32-firebase-2026-default-rtdb.firebaseio.com/
```

## Deploy to Vercel

### Option 1: Import from GitHub
1. Go to https://vercel.com/new
2. Import from GitHub: select `ESP32-Pump-Web` repo
3. Configure:
   - Framework Preset: Next.js
   - Root Directory: `esp`
   - Build Command: `npm install && npm run build`
   - Output Directory: `.next`
4. Add Environment Variables (see above)
5. Click "Deploy"

### Option 2: Vercel CLI
```bash
cd e:/VS_CODE/esp32
vercel --prod
```

## Post-Deployment

1. **Test the app**: Open the provided URL (e.g., `https://esp32-pump-web.vercel.app`)

2. **Verify Firebase connection**: Check browser console for Firebase connection logs

3. **Test remote control**:
   - Flash ESP32 with `esp32-firmware/8_5_firebase_sta.ino`
   - ESP32 should connect to home WiFi
   - Check Firebase Console → Realtime Database → Data
   - You should see your device appear under `/devices/{DEVICE_ID}/`

## ESP32 Device ID

The ESP32 device ID is based on its MAC address (12 hex characters, no colons).
Example: `AABBCCDDEEFF` for MAC `AA:BB:CC:DD:EE:FF`

You can find the device ID in:
1. Firebase Console → Realtime Database → Data → devices
2. ESP32 Serial Monitor (prints "Device ID: ..." on startup)

## Troubleshooting

**Web app can't connect to Firebase**:
- Check environment variables in Vercel
- Verify Realtime Database is created
- Check security rules (should be in Test Mode)

**ESP32 doesn't appear in Firebase**:
- Check ESP32 Serial Monitor for WiFi connection
- Verify Firebase credentials in firmware (8_5_firebase_sta.ino)
- Check if ESP32 has internet connectivity

**Commands not working**:
- Check Firebase Console → Realtime Database → devices/{id}/commands
- Commands should appear with status changing from pending → completed

## Database Structure Reference

```
/devices/{DEVICE_ID}/
  ├── info/
  │   ├── name: "ESP32 Pump ABCD"
  │   ├── type: "syringe_pump"
  │   ├── firmware: "8.5"
  │   └── lastSeen: {timestamp}
  ├── status/
  │   ├── state: "READY"
  │   ├── syringeType: "10CC"
  │   ├── speedMlh: 1.0
  │   ├── volumeMl: 5
  │   ├── pumpRunning: false
  │   └── connectionStatus: "online"
  ├── config/
  │   ├── syringeIndex: 0
  │   ├── speedMlh: 1.0
  │   └── volumeMl: 5
  └── commands/
      └── {COMMAND_ID}/
          ├── type: "START"
          ├── status: "completed"
          └── result: {success: true, message: "..."}
```

## Next Steps

1. ✅ Create Realtime Database in Firebase Console
2. ✅ Deploy security rules
3. ✅ Deploy web app to Vercel
4. ✅ Flash ESP32 with new firmware
5. ✅ Test end-to-end remote control
6. 📝 Update UI to add connection mode selector (Phase 6 - optional)
7. 📝 Add authentication (production security)
