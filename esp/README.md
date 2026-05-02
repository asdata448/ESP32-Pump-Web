# ESP32 Infusion Pump Web Interface

Giao diện web điều khiển từ xa cho máy bơm tiêm ESP32 với giám sát thời gian thực và lịch sử vận hành.

## 📋 Tính năng

- **Điều khiển từ xa**: Start, Pause, Resume, Stop bơm tiêm từ web
- **Cấu hình linh hoạt**: Chọn loại syringe (10CC/20CC), tốc độ (ml/h), thể tích (ml)
- **Giám sát thời gian thực**:
  - Trạng thái máy bơm (state machine)
  - Thanh tiến độ pumping
  - Biểu đồ FSR sensor
  - Thông số kỹ thuật (steps, time remaining)
- **Lịch sử vận hành**: Theo dõi các lần bơm đã hoàn thành
- **Tự động kết nối**: Nhận diện ESP32 qua WiFi AP mode
- **Responsive UI**: Hoạt động trên desktop, tablet, mobile

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Data Fetching**: SWR
- **Charts**: Recharts
- **Icons**: Lucide React

## 📦 Cài đặt

### Yêu cầu

- Node.js 18+
- npm hoặc pnpm

### Cài đặt dependencies

```bash
npm install
# hoặc
pnpm install
```

### Chạy local development

```bash
npm run dev
# hoặc
pnpm dev
```

Mở [http://localhost:3000](http://localhost:3000) trong trình duyệt.

### Build cho production

```bash
npm run build
npm start
```

## 🚀 Sử dụng

### 1. Kết nối với ESP32

- Bật ESP32, kết nối với WiFi `ESP32-PUMP` (password: `12345678`)
- Mở web, nhập IP mặc định `http://192.168.4.1`
- Hoặc cấu hình IP khác trong Connection Settings

### 2. Chuẩn bị bơm (Prepare)

1. Chọn loại syringe (10CC hoặc 20CC)
2. Nhập tốc độ (ml/h) và thể tích (ml)
3. Nhấn **Prepare** - ESP32 sẽ homing piston
4. Đợi trạng thái chuyển sang `READY`

### 3. Bắt đầu bơm (Start)

Khi `contact_found = true` và trạng thái `READY`:

1. Nhấn **Start** để bắt đầu bơm
2. Theo dõi tiến độ và FSR sensor
3. Dùng **Pause/Resume** để tạm dừng/tiếp tục
4. Nhấn **Stop** để dừng hoàn toàn

### 4. Re-home piston

Nhấn **Re-home** để tìm lại vị trí piston (khi thay syringe).

## 📡 API Documentation

Web giao tiếp với ESP32 qua REST API:

### GET /api/status

Lấy trạng thái hiện tại của máy bơm.

**Response:**
```json
{
  "state": "READY",
  "syringe": "20CC",
  "syringe_index": 1,
  "speed_mlh": 120.5,
  "volume_ml": 50,
  "remaining_sec": 1500,
  "steps_completed": 5000,
  "steps_total": 10000,
  "homed": true,
  "contact_found": true,
  "fsr_alert": false,
  "pump_running": false,
  "paused": false,
  "fsr_raw": 420,
  "limit_pressed": false,
  "buzzer_on": false,
  "ip": "192.168.4.1"
}
```

### POST /api/config

Cấu hình tham số bơm.

**Request:**
```json
{
  "syringe_index": 1,
  "speed_mlh": 120.5,
  "volume_ml": 50
}
```

### POST /api/start

Bắt đầu bơm. Yêu cầu `contact_found = true`.

### POST /api/pause

Tạm dừng bơm.

### POST /api/resume

Tiếp tục bơm sau khi pause.

### POST /api/stop

Dừng bơm và reset về trạng thái ban đầu.

### POST /api/rehome

Re-home piston (tìm vị trí ban đầu).

### POST /api/prepare

Chuẩn bị bơm (homing + chờ contact).

### POST /api/reset_alarm

Reset cảnh báo FSR.

### GET /api/history

Lấy danh sách lịch sử các lần bơm.

## 🔧 Cấu hình ESP32

ESP32 chạy ở **AP Mode** với:
- **SSID**: `ESP32-PUMP`
- **Password**: `12345678`
- **IP**: `192.168.4.1`

Để thay đổi, sửa file `.ino` của ESP32:

```cpp
const char* AP_SSID = "ESP32-PUMP";
const char* AP_PASSWORD = "12345678";
```

## 🔥 Firebase Cloud Firestore Integration

Ứng dụng hỗ trợ **lưu trữ lịch sử bơm vào Firebase Cloud Firestore** với các tính năng:

### Tính năng Firebase

- ✅ **Tự động lưu lịch sử**: Lưu tự động khi phiên bơm hoàn thành/dừng/lỗi
- ✅ **Real-time sync**: Cập nhật tự động khi có dữ liệu mới
- ✅ **Multi-device**: Đồng bộ dữ liệu giữa nhiều thiết bị
- ✅ **Lịch sử vĩnh viễn**: Lưu trữ không giới hạn (theo giới hạn Firebase)
- ✅ **Demo mode**: Hoạt động độc lập mà không cần ESP32

### Cấu hình Firebase

#### Bước 1: Tạo Firebase Project

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. **Enable Firestore Database**:
   - Vào **Build** → **Firestore Database**
   - Click **"Create database"**
   - Chọn location: `asia-southeast1` (Singapore)
   - Chọn **"Start in Test mode"**

#### Bước 2: Lấy Firebase Config

1. Vào **Project Settings** (icon bánh răng)
2. Cuộn xuống **"Your apps"**
3. Click **"</>"** icon (Web app)
4. Copy Firebase config

#### Bước 3: Cấu hình Environment Variables

Tạo file `.env.local` trong thư mục `esp/`:

```bash
cp .env.local.example .env.local
```

Điền Firebase config vào `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

⚠️ **Lưu ý:** File `.env.local` KHÔNG được đẩy lên Git (đã có trong `.gitignore`)

#### Bước 4: Restart Development Server

```bash
# Stop server hiện tại (Ctrl+C)
npm run dev
```

### Firestore Security Rules

**Development (Test Mode):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Production (Recommended):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pump_history/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Sử dụng Firebase History

#### Trong Demo Mode

1. Mở [http://localhost:3000/demo](http://localhost:3000/demo)
2. Chạy một phiên demo bơm:
   - Chọn loại ống tiêm → Set tốc độ/thể tích
   - Prepare → Start → Hoàn thành hoặc Stop
3. Vào panel **"Lịch sử"** → Tab **"Firebase"**
4. Xem lịch sử được lưu tự động

#### Test Firebase Connection

1. Mở demo page
2. Panel "Lịch sử" → Tab **"Firebase"**
3. Click button **"Test save"**
4. Nếu thấy **"Đã lưu bản ghi thử thành công!"** → Firebase hoạt động!

#### Xem Dữ liệu trong Firebase Console

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project của bạn
3. **Firestore Database** → **Data**
4. Collection: `pump_history`

### Cấu Trúc Dữ Liệu Firestore

**Collection:** `pump_history`

**Document Structure:**
```json
{
  "id": "auto-generated",
  "deviceId": "demo-device-12345",
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

**Trạng thái (status):**
- `COMPLETED`: Phiên bơm hoàn thành thành công
- `STOPPED`: Người dùng dừng thủ công
- `ERROR`: Có lỗi xảy ra (tắc nghẽn, timeout, v.v.)

### Firebase Free Tier Limits

⚠️ **Lưu ý giới hạn miễn phí:**
- 50K reads/ngày
- 20K writes/ngày
- 1GB storage
- 1GB network transfer/ngày

Để theo dõi usage, vào Firebase Console → **Usage**.

### Xử Lý Sự Cố Firebase

#### Lỗi: "No Firebase App '[DEFAULT]' has been created"

**Nguyên nhân:** Environment variables không được load  
**Giải pháp:**
1. Kiểm tra file `.env.local` có tồn tại
2. Restart dev server
3. Kiểm tra tên biến đúng format

#### Lỗi: "Missing or insufficient permissions"

**Nguyên nhân:** Firestore Security Rules  
**Giải pháp:**
1. Firestore Database → **Rules**
2. Set rules về Test mode hoặc production rules phù hợp
3. Click **"Publish"**

#### Dữ liệu không hiển thị

**Kiểm tra:**
1. Mở Console browser (F12) → Tab Console
2. Tìm logs `[Firebase]`
3. Kiểm tra Firebase Console → Firestore Database → Data

### Tài Liệu Tham Khảo

- 📘 **Hướng dẫn chi tiết**: [FIREBASE_QUICKSTART.md](FIREBASE_QUICKSTART.md)
- 📘 **Hướng dẫn đầy đủ**: [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
- 📘 **Tổng kết tích hợp**: [FIREBASE_INTEGRATION_SUMMARY.md](FIREBASE_INTEGRATION_SUMMARY.md)
- 🔗 [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)
- 🔗 [Firebase Web SDK](https://firebase.google.com/docs/web/setup)

## 📁 Cấu trúc dự án

```
esp32/esp/
├── app/
│   ├── api/           # API routes
│   ├── demo/          # Demo page
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Main pump control page
├── components/
│   ├── pump/          # Pump-specific components
│   ├── esp32/         # ESP32 demo components
│   └── ui/            # shadcn/ui components
├── hooks/             # Custom React hooks
├── lib/               # Utilities và types
└── public/            # Static assets
```

## 🌐 Deployment

### Vercel (Recommended)

1. Fork/push code này lên GitHub
2. Import project vào [Vercel](https://vercel.com)
3. Deploy tự động

### Manual

```bash
npm run build
# Copy .next/ folder và package.json đến server
npm start --production
```

## 🔒 Lưu ý bảo mật

- Mặc định CORS cho phép tất cả origins (`*`)
- Production: Cấu hình CORS chỉ cho domain của bạn
- ESP32 AP mode không có authentication - dùng trong môi trường an toàn

## 🐛 Troubleshooting

### Không kết nối được với ESP32

1. Kiểm tra đã kết nối WiFi `ESP32-PUMP`
2. Ping thử: `ping 192.168.4.1`
3. Kiểm tra Serial Monitor của ESP32

### CORS errors

ESP32 cần gửi CORS headers:

```cpp
void sendCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}
```

### Data không update

Kiểm tra SWR refresh interval trong `use-esp32.ts`:

```typescript
useSWR<PumpStatus>(`${baseUrl}/api/status`, fetcher, {
  refreshInterval: 500,  // 500ms
  revalidateOnFocus: false
})
```

## 📝 License

MIT License - xem file LICENSE

## 👥 Contributing

1. Fork dự án
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push lên branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📧 Liên hệ

Bạn có đề xuất hoặc bug report? Vui lòng mở Issue trên GitHub.

---

Được phát triển để điều khiển ESP32 Infusion Pump từ xa.
