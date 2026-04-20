'use client'

// ═══════════════════════════════════════════════════════════════
// TypeScript Types cho ESP32 Syringe Pump Control System
// Đặt tên theo tiếng Việt có dấu, đầy đủ và chính xác
// ═══════════════════════════════════════════════════════════════

/**
 * Tất cả các trạng thái có thể có của máy bơm ESP32
 */
export type TrangThaiMay =
  | 'BOOT'     // Khởi động
  | 'SYRINGE'  // Chọn ống tiêm
  | 'MAIN'     // Màn hình chính
  | 'SETUP'    // Cài đặt
  | 'PREPARE'  // Chuẩn bị (homing + tìm piston)
  | 'READY'    // Sẵn sàng truyền
  | 'RESULT'   // Đang truyền
  | 'ERROR'    // Lỗi hệ thống
  | 'DONE'     // Hoàn tất
  | 'HOMING'   // Về home

/**
 * Thông tin trạng thái từ ESP32 (/api/status)
 */
export interface TrangThaiESP32 {
  state: TrangThaiMay
  syringe: string                    // "Vinahankook 10CC" hoặc "Vinahankook 20CC"
  syringe_index: number              // 0 = 10CC, 1 = 20CC
  speed_mlh: number                  // ml/h
  volume_ml: number                  // ml
  remaining_sec: number              // giây
  steps_completed: number            // số bước đã thực hiện
  steps_total: number                // tổng số bước
  homed: boolean                     // đã về home
  contact_found: boolean             // đã nhận diện ống
  fsr_alert: boolean                 // cảnh báo tắc
  pump_running: boolean              // đang chạy
  paused: boolean                    // đang tạm dừng
  fsr_raw: number                    // giá trị FSR (0-4095)
  fsr_presence_threshold: number     // ngưỡng nhận diện (450)
  fsr_occlusion_threshold: number    // ngưỡng tắc (2000)
  limit_pressed: boolean             // công tắc giới hạn
  buzzer_on: boolean                 // còi
  ip: string                         // IP ESP32
  wifi_mode: string                  // "AP"
}

/**
 * Cấu hình kết nối ESP32
 */
export interface CauHinhKetNoi {
  baseUrl: string                    // "http://192.168.4.1"
  daKetNoi: boolean
  dangKetNoi: boolean
  doTreMs: number | null
  loiKetNoi: string | null
}

/**
 * Một mục trong nhật ký sự kiện
 */
export interface MucNhatKy {
  id: number
  loai: 'canh_bao' | 'thanh_cong' | 'thong_tin' | 'loi'
  noiDung: string
  thoiGian: Date
}

/**
 * Một mục trong lịch sử bơm (từ /api/history)
 */
export interface MucLichSu {
  speed_mlh: number
  volume_ml: number
  total_sec: number
  syringe: string
  thoiGianGhi: Date
}

/**
 * Trạng thái của hook useESP32
 */
export interface TrangThaiUseESP32 {
  // Kết nối
  cauHinhKetNoi: CauHinhKetNoi
  
  // Trạng thái ESP32
  trangThaiESP32: TrangThaiESP32 | null
  
  // Nhật ký sự kiện
  nhatKySuKien: MucNhatKy[]
  
  // Lịch sử bơm
  lichSuBom: MucLichSu[]
  
  // Chế độ
  cheDoDemo: boolean
  
  // Các hàm
  ketNoi: (ip: string) => Promise<void>
  ngKetNoi: () => void
  capNhatCauHinh: (index: number, speed: number, volume: number) => Promise<void>
  chuanBi: () => Promise<void>
  batDauBom: () => Promise<void>
  tamDung: () => Promise<void>
  tiepTuc: () => Promise<void>
  dungBom: () => Promise<void>
  veHome: () => Promise<void>
  xacNhanBaoDong: () => Promise<void>
  layLichSu: () => Promise<void>
  themLog: (loai: MucNhatKy['loai'], noiDung: string) => void
}

/**
 * Hằng số: các loại ống tiêm được hỗ trợ
 */
export const LOAI_ONG_TIEM = {
  '10CC': { index: 0, ten: 'Vinahankook 10CC', tocDoMax: 60, theTichMax: 10 },
  '20CC': { index: 1, ten: 'Vinahankook 20CC', tocDoMax: 120, theTichMax: 20 },
} as const

/**
 * Trạng thái ESP32 mặc định
 */
export const TRANG_THAI_ESP32_MAC_DINH: TrangThaiESP32 = {
  state: 'BOOT',
  syringe: 'Vinahankook 10CC',
  syringe_index: 0,
  speed_mlh: 1.0,
  volume_ml: 5,
  remaining_sec: 0,
  steps_completed: 0,
  steps_total: 0,
  homed: false,
  contact_found: false,
  fsr_alert: false,
  pump_running: false,
  paused: false,
  fsr_raw: 0,
  fsr_presence_threshold: 450,
  fsr_occlusion_threshold: 2000,
  limit_pressed: false,
  buzzer_on: false,
  ip: '192.168.4.1',
  wifi_mode: 'AP',
}

/**
 * Cấu hình kết nối mặc định
 */
export const CAU_HINH_KET_NOI_MAC_DINH: CauHinhKetNoi = {
  baseUrl: 'http://192.168.4.1',
  daKetNoi: false,
  dangKetNoi: false,
  doTreMs: null,
  loiKetNoi: null,
}
