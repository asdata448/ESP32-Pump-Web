// State machine states for the syringe pump
export type PumpState =
  | 'BOOT'
  | 'SYRINGE'
  | 'MAIN'
  | 'SETUP'
  | 'ADJUST'
  | 'PREPARE'
  | 'READY'
  | 'RESULT'
  | 'ERROR'
  | 'DONE'

export const PUMP_STATES: PumpState[] = [
  'BOOT',
  'SYRINGE',
  'MAIN',
  'SETUP',
  'PREPARE',
  'READY',
  'RESULT',
  'DONE',
]

export const STATE_LABELS: Record<PumpState, string> = {
  BOOT: 'Khởi động',
  SYRINGE: 'Chọn ống tiêm',
  MAIN: 'Màn hình chính',
  SETUP: 'Cài đặt',
  ADJUST: 'Điều chỉnh',
  PREPARE: 'Chuẩn bị',
  READY: 'Sẵn sàng',
  RESULT: 'Đang chạy',
  ERROR: 'Lỗi',
  DONE: 'Hoàn thành',
}

// Syringe types
export type SyringeType = '10CC' | '20CC'

export interface SyringeSpec {
  name: SyringeType
  mmPerMl: number
  label: string
}

export const SYRINGE_SPECS: SyringeSpec[] = [
  { name: '10CC', mmPerMl: 5.0, label: '10CC (5.0 mm/ml)' },
  { name: '20CC', mmPerMl: 3.33, label: '20CC (3.33 mm/ml)' },
]

// Calibration constants
export const CALIBRATION = {
  leadScrewPitch: 8, // mm/rev
  motorStepsPerRev: 200,
  microstep: 8, // 1/8 microstepping
  stepsPerRev: 200 * 8, // 1600 steps/rev
}

// GPIO Pin mapping for ESP32
export const GPIO_PINS = {
  ENA: 25,
  DIR: 32,
  PUL: 33,
  BUZZER: 26,
  FSR: 34,
  LIMIT: 35,
  TFT_CS: 15,
  TFT_DC: 4,
  TFT_RST: 2,
  T_CS: 14,
  T_IRQ: 27,
}

// API Response types
export interface PumpStatus {
  state: PumpState
  syringe: SyringeType
  syringe_index: number
  speed_mlh: number
  volume_ml: number
  remaining_sec: number
  steps_completed: number
  steps_total: number
  homed: boolean
  contact_found: boolean
  fsr_alert: boolean
  pump_running: boolean
  paused: boolean
  fsr_raw: number
  fsr_presence_threshold: number
  fsr_occlusion_threshold: number
  limit_pressed: boolean
  buzzer_on: boolean
  ip: string
  wifi_mode: 'STA' | 'AP'
}

export interface PumpConfig {
  syringe_index: number
  speed_mlh: number
  volume_ml: number
}

export interface HistoryEntry {
  speed_mlh: number
  volume_ml: number
  total_sec: number
  syringe: SyringeType
  timestamp?: string
}

// FSR data point for charts
export interface FSRDataPoint {
  time: number
  value: number
}

// Progress data point for charts
export interface ProgressDataPoint {
  time: number
  progress: number
  volume: number
}

// Default/mock values
export const DEFAULT_STATUS: PumpStatus = {
  state: 'MAIN',
  syringe: '10CC',
  syringe_index: 0,
  speed_mlh: 1.0,
  volume_ml: 5,
  remaining_sec: 0,
  steps_completed: 0,
  steps_total: 5000,
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

export const DEFAULT_CONFIG: PumpConfig = {
  syringe_index: 0,
  speed_mlh: 1.0,
  volume_ml: 5,
}

// Helper functions
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.min(100, Math.round((completed / total) * 100))
}

export function calculateInfusedVolume(
  completed: number,
  total: number,
  targetVolume: number
): number {
  if (total === 0) return 0
  return Number(((completed / total) * targetVolume).toFixed(2))
}

export function getStateColor(state: PumpState): string {
  switch (state) {
    case 'READY':
    case 'DONE':
      return 'text-success'
    case 'RESULT':
      return 'text-primary'
    case 'ERROR':
      return 'text-destructive'
    case 'PREPARE':
    case 'SETUP':
    case 'ADJUST':
      return 'text-warning-foreground'
    default:
      return 'text-muted-foreground'
  }
}

export function getStateBgColor(state: PumpState): string {
  switch (state) {
    case 'READY':
    case 'DONE':
      return 'bg-success/10'
    case 'RESULT':
      return 'bg-primary/10'
    case 'ERROR':
      return 'bg-destructive/10'
    case 'PREPARE':
    case 'SETUP':
    case 'ADJUST':
      return 'bg-warning/10'
    default:
      return 'bg-muted'
  }
}
