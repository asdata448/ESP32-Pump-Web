// ═══════════════════════════════════════════════════════════════════════════
// PATIENT MANAGEMENT UTILITIES - Helper Functions
// ═══════════════════════════════════════════════════════════════════════════
// Utility functions for patient ID generation, validation, and data processing
// ═══════════════════════════════════════════════════════════════════════════

import {
  type Patient,
  type PatientIdConfig,
  type PatientIdParts,
  type PatientRegistrationForm,
  type PatientRegistrationErrors,
  type PumpSession,
  type PumpSessionCreate,
  type PumpSessionStatus,
  type PatientGender,
} from './patient-types'

/**
 * Bỏ dấu tiếng Việt → ASCII (màn TFT mặc định không render Unicode).
 * VD: "Nguyễn Thị Hồng Duyên" → "Nguyen Thi Hong Duyen"
 */
export function chuanHoaTenAscii(ten: string | null | undefined): string {
  if (!ten) return ''
  // Bỏ dấu tổ hợp (U+0300..U+036F) sinh ra sau NFD. Dùng RegExp xây bằng
  // String.fromCharCode để không phải gõ trực tiếp ký tự tổ hợp (combining).
  const dauToHop = new RegExp(
    '[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']',
    'g'
  )
  return ten
    .normalize('NFD')
    .replace(dauToHop, '')
    .replace(/đ/g, 'd') // đ
    .replace(/Đ/g, 'D') // Đ
}

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique patient ID
 * Format: [PREFIX]-[DDMMYY]-[HHMMSS]
 * Example: BN-260609-123456
 */
export function generatePatientId(
  config: PatientIdConfig = {
    prefix: 'BN',
    dateFormat: 'DDMMYY',
    timeFormat: 'HHMMSS',
  },
  date: Date = new Date()
): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear().toString().slice(-2) // Last 2 digits

  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')

  const datePart = `${day}${month}${year}`
  const timePart = `${hours}${minutes}${seconds}`

  return `${config.prefix}-${datePart}-${timePart}`
}

/**
 * Parse a patient ID into its components
 */
export function parsePatientId(patientId: string): PatientIdParts | null {
  const pattern = /^([A-Z]+)-(\d{6})-(\d{6})$/
  const match = patientId.match(pattern)

  if (!match) return null

  const [, prefix, datePart, timePart] = match

  // Parse date from DDMMYY
  const day = parseInt(datePart.slice(0, 2))
  const month = parseInt(datePart.slice(2, 4)) - 1 // Months are 0-indexed
  const year = 2000 + parseInt(datePart.slice(4, 6)) // Assume 20xx

  // Parse time from HHMMSS
  const hours = parseInt(timePart.slice(0, 2))
  const minutes = parseInt(timePart.slice(2, 4))
  const seconds = parseInt(timePart.slice(4, 6))

  const fullDate = new Date(year, month, day, hours, minutes, seconds)

  return {
    prefix,
    date: datePart,
    time: timePart,
    fullDate,
  }
}

/**
 * Validate patient ID format
 */
export function isValidPatientId(patientId: string): boolean {
  return /^BN-\d{6}-\d{6}$/.test(patientId)
}

/**
 * Format patient ID for display
 */
export function formatPatientId(patientId: string): string {
  return patientId // Already formatted, but can add custom formatting here
}

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT REGISTRATION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate patient registration form data
 */
export function validatePatientRegistration(
  form: PatientRegistrationForm
): PatientRegistrationErrors {
  const errors: PatientRegistrationErrors = {}

  // Validate full name
  if (!form.fullName || form.fullName.trim().length < 2) {
    errors.fullName = 'Họ và tên phải có ít nhất 2 ký tự'
  }

  // Validate date of birth
  if (!form.dateOfBirth) {
    errors.dateOfBirth = 'Vui lòng chọn ngày sinh'
  } else {
    const dob = new Date(form.dateOfBirth)
    const now = new Date()

    if (isNaN(dob.getTime())) {
      errors.dateOfBirth = 'Ngày sinh không hợp lệ'
    } else if (dob > now) {
      errors.dateOfBirth = 'Ngày sinh không thể ở tương lai'
    } else {
      const age = calculateAge(form.dateOfBirth)
      if (age > 150) {
        errors.dateOfBirth = 'Ngày sinh không hợp lệ (tuổi quá lớn)'
      }
    }
  }

  // Validate gender
  if (!form.gender || !['MALE', 'FEMALE'].includes(form.gender)) {
    errors.gender = 'Vui lòng chọn giới tính'
  }

  // Validate weight
  if (!form.weight || form.weight <= 0) {
    errors.weight = 'Cân nặng phải lớn hơn 0'
  } else if (form.weight > 300) {
    errors.weight = 'Cân nặng không thể vượt quá 300 kg'
  }

  return errors
}

/**
 * Check if patient registration is valid
 */
export function isRegistrationValid(errors: PatientRegistrationErrors): boolean {
  return Object.keys(errors).length === 0
}

// ═══════════════════════════════════════════════════════════════════════════
// AGE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate age from date of birth
 * Returns age in years
 */
export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth)
  const today = new Date()

  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }

  return age
}

/**
 * Get age group category
 */
export function getAgeGroup(dateOfBirth: string): string {
  const age = calculateAge(dateOfBirth)

  if (age < 1) return 'Sơ sinh'
  if (age < 5) return 'Trẻ nhi'
  if (age < 12) return 'Nhi khoa'
  if (age < 18) return 'Thiếu niên'
  if (age < 60) return 'Người lớn'
  return 'Người cao tuổi'
}

/**
 * Format date of birth for display
 */
export function formatDateOfBirth(dateOfBirth: string): string {
  const date = new Date(dateOfBirth)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

// ═══════════════════════════════════════════════════════════════════════════
// GENDER DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get gender display name in Vietnamese
 */
export function getGenderDisplay(gender: PatientGender): string {
  return gender === 'MALE' ? 'Nam' : 'Nữ'
}

/**
 * Get gender icon/emoji
 */
export function getGenderIcon(gender: PatientGender): string {
  return gender === 'MALE' ? '👨' : '👩'
}

// ═══════════════════════════════════════════════════════════════════════════
// PUMP SESSION STATUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get status display name in Vietnamese
 */
export function getSessionStatusDisplay(status: PumpSessionStatus): string {
  const statusMap: Record<PumpSessionStatus, string> = {
    SCHEDULED: 'Đã lên lịch',
    PREPARING: 'Đang chuẩn bị',
    RUNNING: 'Đang chạy',
    PAUSED: 'Đã tạm dừng',
    COMPLETED: 'Hoàn thành',
    STOPPED: 'Đã dừng',
    ERROR: 'Lỗi',
    CANCELLED: 'Đã hủy',
  }

  return statusMap[status]
}

/**
 * Get status color class for UI
 */
export function getSessionStatusColor(status: PumpSessionStatus): string {
  const colorMap: Record<PumpSessionStatus, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    PREPARING: 'bg-yellow-100 text-yellow-800',
    RUNNING: 'bg-green-100 text-green-800',
    PAUSED: 'bg-orange-100 text-orange-800',
    COMPLETED: 'bg-emerald-100 text-emerald-800',
    STOPPED: 'bg-red-100 text-red-800',
    ERROR: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  }

  return colorMap[status]
}

/**
 * Check if session is active (not completed/failed/cancelled)
 */
export function isSessionActive(status: PumpSessionStatus): boolean {
  return ['SCHEDULED', 'PREPARING', 'RUNNING', 'PAUSED'].includes(status)
}

/**
 * Check if session can be edited
 */
export function canEditSession(status: PumpSessionStatus): boolean {
  return ['SCHEDULED', 'PREPARING'].includes(status)
}

/**
 * Check if session can be stopped
 */
export function canStopSession(status: PumpSessionStatus): boolean {
  return ['RUNNING', 'PAUSED'].includes(status)
}

// ═══════════════════════════════════════════════════════════════════════════
// PUMP SESSION TIME CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate session duration in seconds
 */
export function calculateSessionDuration(
  startTime: string,
  endTime?: string
): number | null {
  if (!endTime) return null

  const start = new Date(`${startTime}`)
  const end = new Date(`${endTime}`)

  return Math.floor((end.getTime() - start.getTime()) / 1000)
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} giây`
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}p`
  }

  return `${minutes}p ${secs}g`
}

/**
 * Format time for display (HH:mm)
 */
export function formatTime(time: string): string {
  if (time.length === 8) {
    // HH:mm:ss format
    return time.slice(0, 5)
  }
  return time
}

/**
 * Format date for display (DD/MM/YYYY)
 */
export function formatDate(date: string): string {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()

  return `${day}/${month}/${year}`
}

// ═══════════════════════════════════════════════════════════════════════════
// PUMP SESSION VOLUME CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate remaining volume
 */
export function calculateRemainingVolume(
  configuredVolume: number,
  infusedVolume: number
): number {
  return Math.max(0, Number((configuredVolume - infusedVolume).toFixed(2)))
}

/**
 * Calculate infusion progress percentage
 */
export function calculateInfusionProgress(
  infusedVolume: number,
  configuredVolume: number
): number {
  if (configuredVolume === 0) return 0
  return Math.min(100, Math.round((infusedVolume / configuredVolume) * 100))
}

/**
 * Calculate estimated completion time
 */
export function calculateEstimatedCompletion(
  configuredVolume: number,
  infusedVolume: number,
  rate: number, // mL/h
  startTime: string
): string | null {
  const remainingVolume = calculateRemainingVolume(configuredVolume, infusedVolume)

  if (remainingVolume <= 0 || rate <= 0) return null

  // Calculate remaining hours
  const remainingHours = remainingVolume / rate
  const remainingSeconds = remainingHours * 3600

  const start = new Date(startTime)
  const completionTime = new Date(start.getTime() + remainingSeconds * 1000)

  return completionTime.toISOString().slice(11, 19) // HH:mm:ss
}

// ═══════════════════════════════════════════════════════════════════════════
// PUMP SESSION CREATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create pump session object from form data
 */
export function createPumpSession(
  data: PumpSessionCreate,
  sessionNumber: number
): Omit<PumpSession, 'id' | 'createdAt' | 'updatedAt'> {
  const now = new Date().toISOString()

  return {
    sessionNumber,
    patientId: data.patientId,
    pumpId: data.pumpId,
    infusionDate: data.infusionDate,
    startTime: data.startTime,
    configuredRate: data.configuredRate,
    configuredVolume: data.configuredVolume,
    infusedVolume: 0,
    remainingVolume: data.configuredVolume,
    status: 'SCHEDULED',
    protocolId: data.protocolId,
    protocolName: data.protocolName,
    syringeType: data.syringeType,
    notes: data.notes,
  }
}

/**
 * Update pump session during execution
 */
export function updatePumpSession(
  session: PumpSession,
  update: Partial<PumpSessionUpdate>
): PumpSession {
  const updated = { ...session }

  if (update.infusedVolume !== undefined) {
    updated.infusedVolume = update.infusedVolume
    updated.remainingVolume = calculateRemainingVolume(
      updated.configuredVolume,
      update.infusedVolume
    )
  }

  if (update.status !== undefined) {
    updated.status = update.status
  }

  if (update.endTime !== undefined) {
    updated.endTime = update.endTime
  }

  if (update.durationSeconds !== undefined) {
    updated.durationSeconds = update.durationSeconds
  }

  if (update.durationFormatted !== undefined) {
    updated.durationFormatted = update.durationFormatted
  }

  if (update.errorDetails !== undefined) {
    updated.errorDetails = update.errorDetails
  }

  if (update.stoppedBy !== undefined) {
    updated.stoppedBy = update.stoppedBy
  }

  updated.updatedAt = new Date().toISOString()

  return updated
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH & FILTERING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filter patients by search term
 */
export function filterPatientsBySearchTerm(
  patients: any[],
  searchTerm: string
): any[] {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return patients
  }

  const term = searchTerm.toLowerCase().trim()

  return patients.filter(
    (patient) =>
      patient.patientId.toLowerCase().includes(term) ||
      patient.fullName.toLowerCase().includes(term)
  )
}

/**
 * Sort patients by creation date (newest first)
 */
export function sortPatientsByDate(patients: any[]): any[] {
  return [...patients].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return dateB - dateA
  })
}

/**
 * Sort sessions by date and time (newest first)
 */
export function sortSessionsByDateTime(sessions: PumpSession[]): PumpSession[] {
  return [...sessions].sort((a, b) => {
    const dateCompare = b.infusionDate.localeCompare(a.infusionDate)
    if (dateCompare !== 0) return dateCompare

    return b.startTime.localeCompare(a.startTime)
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const PATIENT_UTILS = {
  generatePatientId,
  parsePatientId,
  isValidPatientId,
  formatPatientId,
  validatePatientRegistration,
  isRegistrationValid,
  calculateAge,
  getAgeGroup,
  formatDateOfBirth,
  getGenderDisplay,
  getGenderIcon,
  getSessionStatusDisplay,
  getSessionStatusColor,
  isSessionActive,
  canEditSession,
  canStopSession,
  calculateSessionDuration,
  formatDuration,
  formatTime,
  formatDate,
  calculateRemainingVolume,
  calculateInfusionProgress,
  calculateEstimatedCompletion,
  createPumpSession,
  updatePumpSession,
  filterPatientsBySearchTerm,
  sortPatientsByDate,
  sortSessionsByDateTime,
}
