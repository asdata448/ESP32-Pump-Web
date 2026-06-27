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
    displayName: 'Người lớn cấp cứu',
    shortName: 'Người lớn cấp cứu',
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
    displayName: 'Người lớn cấp cứu',
    shortName: 'Người lớn cấp cứu',
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
    displayName: 'Nhi khoa/kháng sinh',
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
    displayName: 'Nhi khoa/kháng sinh',
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

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT MANAGEMENT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

// Patient gender type
export type PatientGender = 'male' | 'female' | 'other'

// Pump session status
export type PumpSessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'paused'

// Patient ID parts (for parsing composite IDs)
export interface PatientIdParts {
  departmentCode: string
  patientNumber: string
  year: string
}

// Core Patient interface
export interface Patient {
  id: string                    // Unique patient ID (format: DEPT-PATIENT_NUM-YEAR, e.g., "ICU-001-2026")
  name: string                  // Patient full name
  gender: PatientGender         // Patient gender
  age: number                   // Patient age (years)
  weight?: number               // Weight in kg (optional)
  department?: string           // Department/ward (e.g., "ICU", "NICU", "Emergency")
  room?: string                 // Room number
  bed?: string                  // Bed number
  admissionDate?: string        // ISO 8601 date string
  dischargeDate?: string        // ISO 8601 date string
  notes?: string                // Additional notes
  createdAt: string             // ISO 8601 timestamp when record created
  updatedAt: string             // ISO 8601 timestamp when last updated
  createdBy?: string            // User ID who created the record
}

// Patient registration form data
export interface PatientRegistrationForm {
  name: string
  gender: PatientGender
  age: number
  weight?: number
  department?: string
  room?: string
  bed?: string
  notes?: string
}

// Pump session interface
export interface PumpSession {
  id: string                    // Unique session ID
  patientId: string             // Reference to Patient.id
  patientName: string           // Denormalized for quick display
  protocolId: ProtocolId        // Protocol used
  protocolName?: string         // Protocol display name
  syringeType: SyringeType      // Syringe used
  speed: number                 // Infusion rate (ml/h)
  volume: number                // Total volume (ml)
  status: PumpSessionStatus     // Current status
  startTime?: string            // ISO 8601 timestamp
  endTime?: string              // ISO 8601 timestamp
  duration?: number             // Duration in seconds
  infusedVolume?: number        // Volume actually infused
  remainingVolume?: number      // Volume remaining
  notes?: string                // Session notes
  createdAt: string             // ISO 8601 timestamp
  updatedAt: string             // ISO 8601 timestamp
  completedBy?: string           // User ID who completed the session
}

// Search parameters for patient queries
export interface PatientSearchParams {
  name?: string                 // Search by patient name (partial match)
  department?: string           // Filter by department
  room?: string                 // Filter by room
  bed?: string                  // Filter by bed
  gender?: PatientGender        // Filter by gender
  minAge?: number              // Minimum age
  maxAge?: number              // Maximum age
  admissionDateFrom?: string   // ISO 8601 date string
  admissionDateTo?: string     // ISO 8601 date string
  discharged?: boolean         // Filter by discharge status
  limit?: number               // Max results (default: 50)
  offset?: number              // Pagination offset (default: 0)
  sortBy?: 'name' | 'age' | 'admissionDate' | 'department'
  sortOrder?: 'asc' | 'desc'
}

// Patient history response
export interface PatientHistoryResponse {
  patient: Patient
  sessions: PumpSession[]
  totalSessions: number
  totalVolumeInfused: number
  averageSessionDuration?: number
  lastSessionDate?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTENDED TYPES - Patient Context Integration
// ═══════════════════════════════════════════════════════════════════════════

// Extended PumpStatus with patient context
export interface PumpStatusWithPatient extends PumpStatus {
  patientId?: string           // Current patient ID (if session active)
  sessionId?: string           // Current session ID (if session active)
  patientName?: string         // Patient name for display
  sessionStatus?: PumpSessionStatus
}

// Extended PumpConfig with patient reference
export interface PumpConfigWithPatient extends PumpConfig {
  patientId?: string           // Patient ID for this configuration
  sessionId?: string           // Session ID (if starting from existing session)
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
  patientId?: string           // Patient associated with this entry
  patientName?: string         // Patient name denormalized
}

// ═══════════════════════════════════════════════════════════════════════════
// FIREBASE DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════

// Firebase document types (for Firestore)
export interface FirebasePatientDocument {
  id: string
  fields: {
    name: { stringValue: string }
    gender: { stringValue: PatientGender }
    age: { integerValue: string }
    weight?: { doubleValue: number }
    department?: { stringValue: string }
    room?: { stringValue: string }
    bed?: { stringValue: string }
    admissionDate?: { timestampValue: string }
    dischargeDate?: { timestampValue: string }
    notes?: { stringValue: string }
    createdAt: { timestampValue: string }
    updatedAt: { timestampValue: string }
    createdBy?: { stringValue: string }
  }
  createTime: string
  updateTime: string
}

export interface FirebaseSessionDocument {
  id: string
  fields: {
    patientId: { stringValue: string }
    patientName: { stringValue: string }
    protocolId: { stringValue: ProtocolId }
    protocolName?: { stringValue: string }
    syringeType: { stringValue: SyringeType }
    speed: { doubleValue: number }
    volume: { doubleValue: number }
    status: { stringValue: PumpSessionStatus }
    startTime?: { timestampValue: string }
    endTime?: { timestampValue: string }
    duration?: { integerValue: string }
    infusedVolume?: { doubleValue: number }
    remainingVolume?: { doubleValue: number }
    notes?: { stringValue: string }
    createdAt: { timestampValue: string }
    updatedAt: { timestampValue: string }
    completedBy?: { stringValue: string }
  }
  createTime: string
  updateTime: string
}

// ═══════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PatientListResponse {
  patients: Patient[]
  total: number
  limit: number
  offset: number
}

export interface PatientCreateResponse {
  success: boolean
  patient?: Patient
  error?: string
}

export interface PatientUpdateResponse {
  success: boolean
  patient?: Patient
  error?: string
}

export interface SessionCreateResponse {
  success: boolean
  session?: PumpSession
  error?: string
}

export interface SessionUpdateResponse {
  success: boolean
  session?: PumpSession
  error?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// CHART DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════

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

// Patient session statistics for charts
export interface PatientSessionStats {
  date: string
  sessionCount: number
  totalVolume: number
  averageDuration: number
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT/MOCK VALUES
// ═══════════════════════════════════════════════════════════════════════════

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

export const DEFAULT_PATIENT: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  gender: 'other',
  age: 0,
  weight: undefined,
  department: '',
  room: '',
  bed: '',
  admissionDate: undefined,
  dischargeDate: undefined,
  notes: '',
}

export const DEFAULT_SESSION: Omit<PumpSession, 'id' | 'patientId' | 'createdAt' | 'updatedAt'> = {
  patientName: '',
  protocolId: 'MANUAL',
  syringeType: '10CC',
  speed: 1.0,
  volume: 5,
  status: 'scheduled',
  startTime: undefined,
  endTime: undefined,
  duration: undefined,
  infusedVolume: 0,
  remainingVolume: 5,
  notes: '',
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

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

// Patient ID generator
export function generatePatientId(
  department: string,
  patientNumber: string,
  year?: string
): string {
  const currentYear = year || new Date().getFullYear().toString()
  return `${department.toUpperCase()}-${patientNumber}-${currentYear}`
}

// Parse patient ID into components
export function parsePatientId(patientId: string): PatientIdParts | null {
  const parts = patientId.split('-')
  if (parts.length !== 3) return null
  const [departmentCode, patientNumber, year] = parts
  return { departmentCode, patientNumber, year }
}

// Format patient display name
export function formatPatientDisplayName(patient: Patient): string {
  const ageStr = `${patient.age}yo`
  const genderStr = patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'O'
  return `${patient.name} (${ageStr}, ${genderStr})`
}

// Calculate session duration
export function calculateSessionDuration(startTime: string, endTime?: string): number {
  const start = new Date(startTime).getTime()
  const end = endTime ? new Date(endTime).getTime() : Date.now()
  return Math.floor((end - start) / 1000) // Return in seconds
}

// Get session status color
export function getSessionStatusColor(status: PumpSessionStatus): string {
  switch (status) {
    case 'completed':
      return 'text-success'
    case 'in_progress':
      return 'text-primary'
    case 'paused':
      return 'text-warning-foreground'
    case 'cancelled':
      return 'text-destructive'
    case 'scheduled':
    default:
      return 'text-muted-foreground'
  }
}

// Get session status background color
export function getSessionStatusBgColor(status: PumpSessionStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-success/10'
    case 'in_progress':
      return 'bg-primary/10'
    case 'paused':
      return 'bg-warning/10'
    case 'cancelled':
      return 'bg-destructive/10'
    case 'scheduled':
    default:
      return 'bg-muted'
  }
}

// Validate patient data
export function validatePatientData(data: PatientRegistrationForm): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Patient name is required')
  }

  if (data.age < 0 || data.age > 150) {
    errors.push('Age must be between 0 and 150')
  }

  if (data.weight !== undefined && (data.weight < 0 || data.weight > 300)) {
    errors.push('Weight must be between 0 and 300 kg')
  }

  if (!['male', 'female', 'other'].includes(data.gender)) {
    errors.push('Invalid gender value')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Generate session summary
export function generateSessionSummary(session: PumpSession): string {
  const duration = session.duration || calculateSessionDuration(session.startTime!, session.endTime)
  const timeStr = formatTime(duration)
  const volumeStr = `${session.infusedVolume || 0}/${session.volume}ml`
  return `${volumeStr} in ${timeStr}`
}
