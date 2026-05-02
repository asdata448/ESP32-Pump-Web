# 🚀 Quick Start - Tích hợp Firebase

## Bước 1: Tạo Firebase Project (5 phút)

1. Vào https://console.firebase.google.com/
2. Click **"Add project"**
3. Đặt tên: `esp32-pump-tracker`
4. Click **"Create project"** (không cần Google Analytics)

## Bước 2: Tạo Firestore Database (2 phút)

1. Vào **Build** → **Firestore Database**
2. Click **"Create database"**
3. Chọn location: `asia-southeast1` (hoặc default)
4. Chọn **"Start in Test mode"**
5. Click **"Enable"**

## Bước 3: Lấy Firebase Config (1 phút)

1. Vào **Project Settings** ( bánh răng icon)
2. Cuộn xuống **"Your apps"**
3. Click **"</>"** icon (Web)
4. Đặt tên app: `Pump Dashboard`
5. Click **"Register app"**
6. Copy các giá trị sau:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

## Bước 4: Cấu hình Environment Variables (2 phút)

1. Tạo file `.env.local` trong thư mục `esp`:
   ```bash
   cd E:/VS_CODE/esp32/esp
   copy .env.local.example .env.local
   ```

2. Mở `.env.local` và điền thông tin Firebase:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy... (apiKey của bạn)
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=esp32-pump-tracker.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=esp32-pump-tracker
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=esp32-pump-tracker.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

3. Lưu file

## Bước 5: Kiểm tra kết nối (1 phút)

1. Restart dev server:
   ```bash
   npm run dev
   ```

2. Mở http://localhost:3000/demo

3. Trong panel **"Lịch sử"**, chuyển sang tab **"Firebase"**

4. Click button **"Test save"**

5. Nếu thấy **"Đã lưu bản ghi thử thành công!"** → Firebase đã kết nối! 🎉

## Bước 6: Chạy demo và xem lịch sử (5 phút)

1. Chạy một phiên demo máy bơm:
   - Chọn loại ống tiêm (10CC hoặc 20CC)
   - Set tốc độ và thể tích
   - Prepare → Start
   - Đợi hoàn thành hoặc Stop

2. Mở tab **"Firebase"** trong panel Lịch sử

3. Xem bản ghi đã được lưu

4. Kiểm tra trong Firebase Console:
   - Firestore Database → **pump_history** collection
   - Xem document mới được tạo

## ✅ Checklist

- [x] Tạo Firebase project
- [x] Tạo Firestore database
- [x] Lấy Firebase config
- [x] Tạo file `.env.local`
- [x] Điền Firebase config
- [x] Restart dev server
- [x] Test save thành công
- [x] Chạy demo đầy đủ
- [x] Xem lịch sử trong Firebase

## 🆘 Troubleshooting

### Lỗi: "Firebase: No Firebase App '[DEFAULT]' has been created"

**Giải pháp:**
1. Kiểm tra file `.env.local` có đúng path
2. Restart dev server
3. Kiểm tra tên biến trong `.env.local` đúng format

### Lỗi: "Missing or insufficient permissions"

**Giải pháp:**
1. Firebase Console → Firestore Database → **Rules**
2. Paste:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
3. Click **"Publish"**

### Test save không thành công

**Giải pháp:**
1. Mở Console browser (F12)
2. Xem lỗi trong Console tab
3. Kiểm tra Network tab → có request tới Firestore?
4. Kiểm tra Firebase config đúng chưa

## 📚 Tham khảo thêm

- Xem hướng dẫn chi tiết: `FIREBASE_SETUP.md`
- Xem tổng tích hợp: `FIREBASE_INTEGRATION_SUMMARY.md`
- Firebase docs: https://firebase.google.com/docs/firestore
