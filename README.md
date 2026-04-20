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
