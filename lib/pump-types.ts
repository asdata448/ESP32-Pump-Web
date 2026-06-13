// State machine states for the syringe pump
export type PumpState =
  | 'BOOT'
  | 'SYRINGE'
  | 'PROTOCOL_SELECT'
  | 'MAIN'
  | 'SETUP'
  | 'ADJUST'
  | 'PREPARE'
  | 'READY'
  | 'RESULT'
  | 'HOMING'
  | 'ERROR'
  | 'DONE'

export const PUMP_STATES: PumpState[] = [
  'BOOT',
  'SYRINGE',
  'PROTOCOL_SELECT',
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
  PROTOCOL_SELECT: 'Chọn protocol',
  MAIN: 'Màn hình chính',
  SETUP: 'Cài đặt',
  ADJUST: 'Điều chỉnh',
  PREPARE: 'Chuẩn bị',
  READY: 'Sẵn sàng',
  RESULT: 'Đang chạy',
  HOMING: 'Đang về home',
  ERROR: 'Lỗi',
  DONE: 'Hoàn thành',
}

// ═══════════════════════════════════════════════════════════════════════════
// PROTOCOL SYSTEM - Medical Infusion Protocols
// ═══════════════════════════════════════════════════════════════════════════
// System provides pre-configured medical protocols for common infusion scenarios.
// Each protocol includes: syringe compatibility, rate ranges, default VTBI, etc.
//
// Usage:
// 1. User selects syringe type (10CC or 20CC)
// 2. System filters compatible protocols
// 3. User selects protocol or chooses MANUAL mode
// 4. Protocol settings are applied to pump configuration
//
// Integration: Used in ProtocolSelectionDialog and ProtocolSelectScreen components
// ═══════════════════════════════════════════════════════════════════════════

// Protocol types
export type ProtocolId =
  | 'ADULT_ACUTE_SLOW'
  | 'ADULT_ACUTE_AVG'
  | 'ICU_VENT_SLOW'
  | 'ICU_VENT_FAST'
  | 'ICU_SHOCK_SLOW'
  | 'ICU_SHOCK_AVG'
  | 'PEDIATRIC_10CC'
  | 'PEDIATRIC_20CC'
  | 'NEONATAL_NICU'
  | 'POST_OP_PCA'
  | 'MANUAL'

export interface InfusionProtocol {
  id: ProtocolId
  displayName: string      // Full protocol name (Đối tượng)
  shortName: string        // Short display name
  syringeIndex: number     // 0=10CC, 1=20CC
  defaultRate: number      // Default infusion rate (ml/h)
  minRate: number         // Minimum rate (ml/h)
  maxRate: number         // Maximum rate (ml/h)
  defaultVTBI: number     // Default Volume To Be Infused (ml)
  fixedRate: boolean      // If true, rate cannot be changed (single value)
  disableEditing: boolean // If true, ALL parameters locked except speed (for range protocols)
  description: string     // Human-readable description (duration, etc.)
}

export const PROTOCOLS: InfusionProtocol[] = [
  {
    id: 'ADULT_ACUTE_SLOW',
    displayName: 'Người lớn đau cấp',
    shortName: 'Người lớn đau cấp',
    syringeIndex: 0,
    defaultRate: 1.0,
    minRate: 1.0,
    maxRate: 5.0,
    defaultVTBI: 10,
    fixedRate: false,
    disableEditing: true, // Only speed editable within range
    description: '~10 giờ'
  },
  {
    id: 'ADULT_ACUTE_AVG',
    displayName: 'Người lớn đau cấp',
    shortName: 'Người lớn đau cấp',
    syringeIndex: 1,
    defaultRate: 2.0,
    minRate: 1.0,
    maxRate: 15.0,
    defaultVTBI: 20,
    fixedRate: false,
    disableEditing: true, // Only speed editable within range
    description: '~10 giờ'
  },
  {
    id: 'ICU_VENT_SLOW',
    displayName: 'ICU người lớn thở máy',
    shortName: 'ICU người lớn thở máy',
    syringeIndex: 1,
    defaultRate: 3.5,
    minRate: 2.1,
    maxRate: 28.0,
    defaultVTBI: 20,
    fixedRate: false,
    disableEditing: true, // Only speed editable within range
    description: '~5h 43m'
  },
  {
    id: 'ICU_VENT_FAST',
    displayName: 'ICU người lớn thở máy',
    shortName: 'ICU người lớn thở máy',
    syringeIndex: 1,
    defaultRate: 7.0,
    minRate: 2.1,
    maxRate: 28.0,
    defaultVTBI: 20,
    fixedRate: false,
    disableEditing: true, // Only speed editable within range
    description: '~2h 51m'
  },
  {
    id: 'ICU_SHOCK_SLOW',
    displayName: 'ICU sốc người lớn',
    shortName: 'ICU sốc người lớn',
    syringeIndex: 1,
    defaultRate: 2.6,
    minRate: 0.5,
    maxRate: 21.0,
    defaultVTBI: 20,
    fixedRate: false,
    disableEditing: true, // Only speed editable within range
    description: '~7h 41m'
  },
  {
    id: 'ICU_SHOCK_AVG',
    displayName: 'ICU sốc người lớn',
    shortName: 'ICU sốc người lớn',
    syringeIndex: 1,
    defaultRate: 5.0,
    minRate: 0.5,
    maxRate: 21.0,
    defaultVTBI: 20,
    fixedRate: false,
    disableEditing: true, // Only speed editable within range
    description: '~4 giờ'
  },
  {
    id: 'PEDIATRIC_10CC',
    displayName: 'Nhi khoa/kháng sinh ngắt quãng',
    shortName: 'Nhi khoa/Kháng sinh',
    syringeIndex: 0,
    defaultRate: 10.0,
    minRate: 10.0,
    maxRate: 10.0,
    defaultVTBI: 10,
    fixedRate: true,
    disableEditing: true, // All parameters locked
    description: '~60 phút'
  },
  {
    id: 'PEDIATRIC_20CC',
    displayName: 'Nhi khoa/kháng sinh ngắt quãng',
    shortName: 'Nhi khoa/Kháng sinh',
    syringeIndex: 1,
    defaultRate: 20.0,
    minRate: 20.0,
    maxRate: 20.0,
    defaultVTBI: 20,
    fixedRate: true,
    disableEditing: true, // All parameters locked
    description: '~60 phút'
  },
  {
    id: 'NEONATAL_NICU',
    displayName: 'Sơ sinh/NICU',
    shortName: 'Sơ sinh/NICU',
    syringeIndex: 0,
    defaultRate: 1.8,
    minRate: 1.2,
    maxRate: 2.4,
    defaultVTBI: 10,
    fixedRate: false,
    disableEditing: true, // Only speed editable within range
    description: '~5h 33m'
  },
  {
    id: 'POST_OP_PCA',
    displayName: 'Sau mổ/PCA mô phỏng',
    shortName: 'Sau mổ/PCA mô phỏng',
    syringeIndex: 0,
    defaultRate: 60.0,
    minRate: 30.0,
    maxRate: 60.0,
    defaultVTBI: 1,
    fixedRate: false,
    disableEditing: true, // Only speed editable within range
    description: '~1 phút'
  }
]

export function getProtocolById(id: ProtocolId): InfusionProtocol | undefined {
  if (id === 'MANUAL') return undefined
  return PROTOCOLS.find(p => p.id === id)
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
  protocol_id?: ProtocolId
  protocol_name?: string
  fixed_rate?: boolean
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
  protocol_id?: ProtocolId
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
  protocol_id: 'MANUAL',
  protocol_name: 'Thủ công',
  fixed_rate: false,
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
  ip: '172.20.10.9',
  wifi_mode: 'AP',
}

export const DEFAULT_CONFIG: PumpConfig = {
  syringe_index: 0,
  protocol_id: 'MANUAL',
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
