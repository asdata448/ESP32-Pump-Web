// Firebase Configuration for ESP32 Project
// Project: esp32-firebase-2026
// Created: 2026-04-30

const firebaseConfig = {
  apiKey: "AIzaSyC9XlTugbmJPh77YymSFNNPf8UORHJi2qw",
  authDomain: "esp32-firebase-2026.firebaseapp.com",
  projectId: "esp32-firebase-2026",
  storageBucket: "esp32-firebase-2026.firebasestorage.app",
  messagingSenderId: "173601455015",
  appId: "1:173601455015:web:45c12915ffe835300cd482",
  measurementId: "G-XXXXXXXXXX" // Optional: Add if using Analytics
};

// Export for use in your project
if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfig;
}
