# Hướng dẫn thiết lập Firebase cho Máy Bơm Tiêm Điện

## Bước 1: Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Đăng nhập bằng Google Account
3. Nhấn **"Add project"** hoặc **"Tạo dự án"**
4. Đặt tên project (ví dụ: `esp32-pump-tracker`)
5. Có thể tắt Google Analytics cho project này

## Bước 2: Tạo Firestore Database

1. Trong Firebase Console, chọn project của bạn
2. Menu sidebar → **Build** → **Firestore Database**
3. Nhấn **"Create database"** hoặc **"Tạo cơ sở dữ liệu"**
4. Chọn location (ví dụ: asia-southeast1)
5. Chế độ bảo mật: Chọn **"Start in Test mode"** hoặc **"Bắt đầu ở chế độ thử nghiệm"**
   - Lưu ý: Chế độ test sẽ cho phép read/write truy cập trong 30 ngày
   - Sau đó cần cấu hình Security Rules

### Firestore Security Rules (Tùy chọn)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pump_history/{document=**} {
      allow read: if true;
      allow write: if request.resource.data.deviceId == request.auth.token.device_id;
    }
  }
}
```

## Bước 3: Thêm Web App vào Firebase

1. Firebase Console → Project Overview → **Settings icon** → **Project settings**
2. Cuộn xuống "Your apps" → Nhấn **"</>"** icon (Web)
3. Đặt tên app (ví dụ: "Pump Dashboard")
4. **KHÔNG** cần đánh dấu "Firebase Hosting"
5. Nhấn **"Register app"** hoặc **"Đăng ký ứng dụng"**

## Bước 4: Lấy Firebase Config

1. Sau khi đăng ký, Firebase sẽ cung cấp `firebaseConfig`
2. Copy các giá trị sau:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
}
```

## Bước 5: Cấu hình Environment Variables

1. Tạo file `.env.local` trong thư mục `esp` (nếu chưa có):
   ```bash
   cp .env.example .env.local
   ```

2. Điền Firebase config vào `.env.local`:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy... (apiKey của bạn)
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

3. Lưu file `.env.local` (file này sẽ KHÔNG được đẩy lên Git)

## Bước 6: Kiểm tra kết nối

1. Chạy development server:
   ```bash
   npm run dev
   # hoặc
   pnpm dev
   ```

2. Mở trình duyệt vào `http://localhost:3000/demo`

3. Trong tab "Demo máy bơm":
   - Chạy một phiên bơm demo
   - Khi hoàn thành, tự động lưu vào Firebase

4. Trong tab "Lịch sử Firebase":
   - Nhấn nút **"Test save"** để kiểm tra kết nối
   - Nếu thấy bản ghi xuất hiện → Firebase đã kết nối thành công!

## Bước 7: Xem dữ liệu trong Firestore

1. Firebase Console → Firestore Database
2. Collection: `pump_history`
3. Xem các documents được lưu

### Cấu trúc Document

```json
{
  "deviceId": "demo-1234567890-abc123",
  "syringeType": "10CC",
  "speedMlh": 5.0,
  "volumeMl": 10.0,
  "infusedVolumeMl": 10.0,
  "totalTimeSec": 7200,
  "status": "COMPLETED",
  "timestamp": { "_seconds": 1234567890, "_nanoseconds": 0 },
  "createdAt": { "_seconds": 1234567890, "_nanoseconds": 0 },
  "notes": null,
  "errorType": null
}
```

## Xử lý sự cố

### Lỗi "Firebase: No Firebase App '[DEFAULT]' has been created"

**Nguyên nhân:** Environment variables không được load

**Giải pháp:**
1. Kiểm tra file `.env.local` có đúng path
2. Restart dev server sau khi tạo/sửa `.env.local`
3. Kiểm tra các biến trong `.env.local` đúng tên với `firebaseConfig`

### Lỗi "Missing or insufficient permissions"

**Nguyên nhân:** Firestore Security Rules chặn write

**Giải pháp:**
1. Firestore Database → Rules
2. Tạm thời set:
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
3. Sau đó cấu hình rules bảo mật hơn

### Dữ liệu không xuất hiện trong Firebase History Panel

**Kiểm tra:**
1. Console browser (F12) → Tab Console có lỗi gì?
2. Firebase Console → Firestore Database → Data → Có collection `pump_history`?
3. Network tab → Có request tới Firestore?

### Lỗi "Failed to fetch"

**Nguyên nhân:** CORS hoặc Network

**Giải pháp:**
1. Kiểm tra internet connection
2. Kiểm tra Firestore location
3. Thử đăng xuất và đăng nhập lại Firebase Console

## Ghi chú quan trọng

- `.env.local` KHÔNG bao giờ commit vào Git
- File `.env.local` đã được thêm vào `.gitignore`
- Mỗi môi trường (dev, prod) cần `.env.local` riêng
- Firebase free tier có giới hạn:
  - 50K reads/day
  - 20K writes/day
  - 1GB storage

## Bước tiếp theo (Tùy chọn)

### Thêm Authentication (Đăng nhập người dùng)

1. Firebase Console → Authentication
2. Enable **Email/Password** hoặc **Google Sign-in**
3. Cập nhật Security Rules để chỉ user đã đăng nhập mới truy cập được

### Thêm Real-time Sync (Tùy chọn)

Đã có sẵn trong code! Sử dụng `onSnapshot` listener để:
- Tự động cập nhật khi có bản ghi mới
- Multi-device sync (nhiều thiết bị cùng xem)

### Thêm Push Notifications (Tùy chọn)

1. Firebase Console → Cloud Messaging
2. Lấy VAPID Key
3. Thêm vào `.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
   ```
4. Request notification permission trong app
