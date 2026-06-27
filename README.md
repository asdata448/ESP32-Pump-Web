# 🏥 Máy Bơm Tiêm Điện — Web App

Hệ thống giám sát và điều khiển **máy bơm tiêm điện** qua WiFi, tích hợp quản lý bệnh nhân và lưu trữ đám mây Firebase.

## 📌 Thông tin đồ án

| | |
|---|---|
| **Trường** | Đại học Công nghệ Kỹ thuật TP.HCM (UTE) |
| **Khoa** | Điện — Điện tử |
| **Ngành** | Kỹ thuật Y sinh |
| **Đề tài** | Thiết kế và thi công máy bơm tiêm điện có tích hợp giám sát, điều khiển trên nền tảng Firebase |
| **GVHD** | ThS. Võ Đức Dũng |
| **SVTH** | Nguyễn Thị Hồng Duyên (22129008) · Nguyễn Minh Phong (22120931) |

## 🛠 Công nghệ

- **Framework:** Next.js 16 (App Router) + TypeScript
- **UI:** React 19 + Tailwind CSS 4 + shadcn/Radix UI + Framer Motion
- **Cloud:** Firebase Firestore (bệnh nhân + lịch sử bơm)
- **Deploy:** Vercel
- **Hardware:** ESP32 (firmware riêng, điều khiển qua HTTP REST API)

## 🚀 Cài đặt

```bash
# Cài dependencies
npm install

# Chạy dev
npm run dev

# Build production
npm run build

# Deploy Vercel
vercel --prod
```

## ⚙️ Cấu hình Firebase

Tạo file `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
```

## 📱 Tính năng chính

- **Điều khiển máy bơm:** Bắt đầu / Tạm dừng / Tiếp tục / Dừng qua WiFi (HTTP)
- **Quản lý bệnh nhân:** Đăng ký (tự sinh mã `BN-DDMMYY-HHMMSS`), tìm kiếm, xem lịch sử bơm
- **Giám sát real-time:** Tốc độ, thể tích, đã truyền, thời gian còn lại, tiến độ
- **Cảnh báo an toàn:** Phát hiện tắc ống (FSR), báo động
- **Lưu đám mây:** Tự động lưu phiên bơm vào Firestore khi hoàn tất
- **Giao diện y tế:** Dark theme chuyên nghiệp, responsive

## 📂 Cấu trúc thư mục

```
├── app/                  # Next.js App Router (pages + API routes)
│   ├── api/              # REST API proxy tới ESP32 + Firebase
│   ├── patients/         # API quản lý bệnh nhân
│   ├── page.tsx          # Trang chính (điều khiển + giám sát)
│   └── layout.tsx        # Layout + metadata
├── components/
│   ├── intro/            # Intro / splash screen
│   ├── patients/         # UI bệnh nhân (form, search, history)
│   ├── pump/             # UI bơm (data grid, controls)
│   └── ui/               # shadcn/Radix components
├── hooks/                # Custom hooks (ESP32 connection, Firebase)
├── lib/                  # Utils, types, Firebase integration
└── public/               # Logo, ảnh tĩnh
```

## 🔌 Kết nối ESP32

1. ESP32 kết nối WiFi (cài sẵn trong firmware)
2. Máy tính / điện thoại **cùng mạng WiFi** với ESP32
3. Nhập địa chỉ IP của ESP32 (hiển thị trên màn LCD)
4. Bấm **KẾT NỐI WIFI** → điều khiển

## 📄 License

Đồ án tốt nghiệp — Kỹ thuật Y sinh, UTE.
