// ═══════════════════════════════════════════════════════════════════════════
// PATIENT MANAGEMENT SYSTEM - TypeScript Interfaces & Types
// ═══════════════════════════════════════════════════════════════════════════
// Comprehensive patient data management for ESP32 pump control system.
// Handles patient registration, pump session history, and Firebase integration.
//
// Features:
// - Patient registration with auto-generated IDs
// - Pump session history tracking
// - Firebase Firestore integration
// - Patient search and filtering
// - Medical protocol association
//
// Patient ID Format: BN-[DDMMYY]-[HHMMSS]
// Example: BN-260609-1234 (Patient registered on 26/06/2009 at 12:34:56)
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Patient gender enum
 */
export type PatientGender = 'MALE' | 'FEMALE'

/**
 * Pump session status enum
 */
export type PumpSessionStatus =
  | 'SCHEDULED'     // Scheduled for future
  | 'PREPARING'     // Currently preparing
  | 'RUNNING'       // Currently running
  | 'PAUSED'        // Paused by user
  | 'COMPLETED'     // Successfully completed
  | 'STOPPED'       // Stopped manually
  | 'ERROR'         // Error occurred
  | 'CANCELLED'     // Cancelled before start

/**
 * Firebase Firestore document references
 */
export interface FirestoreDocument {
  id: string
  createdAt: string
  updatedAt: string
  [key: string]: any
}

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT REGISTRATION TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Patient registration form data
 * Used for creating new patient records
 */
export interface PatientRegistrationForm {
  fullName: string              // Họ và tên (Full name)
  dateOfBirth: string           // Ngày tháng năm sinh (YYYY-MM-DD format)
  gender: PatientGender         // Giới tính (Nam/Nữ)
  weight: number                // Cân nặng (kg)
  // Auto-generated, not included in form
  patientId?: string            // Auto-generated ID
}

/**
 * Validation errors for patient registration
 */
export interface PatientRegistrationErrors {
  fullName?: string             // Required, min 2 characters
  dateOfBirth?: string          // Required, valid date, not in future
  gender?: string               // Required
  weight?: string              // Required, > 0 and < 300 kg
}

/**
 * Patient registration response
 */
export interface PatientRegistrationResponse {
  success: boolean
  patient?: Patient
  error?: string
  validationErrors?: PatientRegistrationErrors
}

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT DATA TYPES
// ═════════════════════════════════════════════════════════════════════════

/**
 * Complete patient information
 * Stored in Firestore 'patients' collection
 */
export interface Patient extends FirestoreDocument {
  patientId: string             // BN-[DDMMYY]-[HHMMSS]
  fullName: string              // Họ và tên
  dateOfBirth: string           // YYYY-MM-DD format
  gender: PatientGender         // MALE | FEMALE
  weight: number                // kg
  metadata?: PatientMetadata    // Optional metadata
}

/**
 * Optional patient metadata
 */
export interface PatientMetadata {
  registrationSource?: 'WEB' | 'MOBILE' | 'API'
  registeredBy?: string         // User ID who registered
  notes?: string                // Additional notes
  tags?: string[]               // Searchable tags
}

/**
 * Patient search result
 * Lightweight version for search results
 */
export interface PatientSearchResult {
  patientId: string
  fullName: string
  dateOfBirth: string
  gender: PatientGender
  weight: number
  age?: number                  // Calculated age
  sessionCount?: number        // Number of pump sessions
  lastSessionDate?: string      // Last pump session date
}

/**
 * Patient search query
 */
export interface PatientSearchQuery {
  searchTerm?: string           // Search by patient ID or name
  gender?: PatientGender        // Filter by gender
  minWeight?: number            // Filter min weight
  maxWeight?: number            // Filter max weight
  dateOfBirthFrom?: string     // Filter DOB from date
  dateOfBirthTo?: string       // Filter DOB to date
  limit?: number                // Max results (default 50)
  offset?: number               // Pagination offset
}

/**
 * Patient search response
 */
export interface PatientSearchResponse {
  results: PatientSearchResult[]
  total: number
  hasMore: boolean
  query: PatientSearchQuery
}

// ═══════════════════════════════════════════════════════════════════════════
// PUMP SESSION TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pump session history entry
 * Stored in Firestore 'pumpSessions' subcollection under each patient
 */
export interface PumpSession extends FirestoreDocument {
  sessionNumber: number         // Session number for this patient (1, 2, 3...)
  patientId: string             // Reference to parent patient
  pumpId: string                // Mã bơm (pump identifier)

  // Session details
  infusionDate: string          // Ngày truyền (YYYY-MM-DD)
  startTime: string             // Giờ bắt đầu (HH:mm:ss format)
  endTime?: string             // Giờ kết thúc (null if running)

  // Pump configuration
  configuredRate: number       // Tốc độ cài (mL/h)
  configuredVolume: number     // Thể tích cài (mL)
  infusedVolume: number        // Thể tích đã bơm (mL)
  remainingVolume: number     // Thể tích còn lại (mL)

  // Status & duration
  status: PumpSessionStatus    // Trạng thái
  durationSeconds?: number     // Total duration in seconds
  durationFormatted?: string   // Formatted duration (e.g., "2h 30m")

  // Medical protocol & syringe
  protocolId?: string          // Protocol ID (from pump-types.ts)
  protocolName?: string        // Protocol display name
  syringeType: string          // Syringe type (10CC | 20CC)

  // Additional data
  notes?: string               // Session notes
  errorDetails?: string        // Error details if status is ERROR
  stoppedBy?: string           // User who stopped the session
}

/**
 * Pump session creation data
 * Used when starting a new pump session
 */
export interface PumpSessionCreate {
  patientId: string            // Required: patient reference
  pumpId: string               // Required: pump identifier
  infusionDate: string         // Required: YYYY-MM-DD
  startTime: string            // Required: HH:mm:ss
  configuredRate: number      // Required: mL/h
  configuredVolume: number    // Required: mL
  protocolId?: string         // Optional: protocol ID
  protocolName?: string       // Optional: protocol name
  syringeType: string         // Required: 10CC | 20CC
  notes?: string              // Optional: session notes
}

/**
 * Pump session update data
 * Used for updating session status and progress
 */
export interface PumpSessionUpdate {
  endTime?: string             // Set when session ends
  infusedVolume?: number       // Update during pumping
  remainingVolume?: number     // Calculate from infused
  status?: PumpSessionStatus   // Update status
  durationSeconds?: number     // Calculate when completed
  durationFormatted?: string   // Format for display
  errorDetails?: string        // Add if error occurs
  stoppedBy?: string           // Add if manually stopped
}

/**
 * Pump session history response
 */
export interface PumpSessionHistoryResponse {
  patientId: string
  patient: PatientSearchResult | null
  sessions: PumpSession[]
  totalSessions: number
  totalInfusedVolume: number   // Sum of all completed sessions
}

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Patient ID generator configuration
 */
export interface PatientIdConfig {
  prefix: string               // Default: 'BN'
  dateFormat: string           // Default: 'DDMMYY'
  timeFormat: string           // Default: 'HHMMSS'
}

/**
 * Patient ID parts (parsed from existing ID)
 */
export interface PatientIdParts {
  prefix: string               // 'BN'
  date: string                 // '260609' (DDMMYY)
  time: string                 // '123456' (HHMMSS)
  fullDate: Date               // Parsed date object
}

// ═══════════════════════════════════════════════════════════════════════════
// FIRESTORE COLLECTION STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Firestore collection names
 */
export const COLLECTIONS = {
  PATIENTS: 'patients',              // Root collection for patients
  PUMP_SESSIONS: 'pumpSessions',     // Subcollection under each patient
} as const

/**
 * Firestore document structure
 *
 * Root Collection: patients
 * └── Document: {patientId}
 *     ├── patientId: string
 *     ├── fullName: string
 *     ├── dateOfBirth: string
 *     ├── gender: 'MALE' | 'FEMALE'
 *     ├── weight: number
 *     ├── metadata: PatientMetadata
 *     ├── createdAt: string (ISO 8601)
 *     └── updatedAt: string (ISO 8601)
 *         └── Subcollection: pumpSessions
 *             └── Document: {sessionNumber}
 *                 ├── sessionNumber: number
 *                 ├── patientId: string
 *                 ├── pumpId: string
 *                 ├── infusionDate: string
 *                 ├── startTime: string
 *                 ├── endTime?: string
 *                 ├── configuredRate: number
 *                 ├── configuredVolume: number
 *                 ├── infusedVolume: number
 *                 ├── remainingVolume: number
 *                 ├── status: PumpSessionStatus
 *                 ├── durationSeconds?: number
 *                 ├── durationFormatted?: string
 *                 ├── protocolId?: string
 *                 ├── protocolName?: string
 *                 ├── syringeType: string
 *                 ├── notes?: string
 *                 ├── errorDetails?: string
 *                 ├── stoppedBy?: string
 *                 ├── createdAt: string
 *                 └── updatedAt: string
 */

// ═══════════════════════════════════════════════════════════════════════════
// FIRESTORE INDEX REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Firestore composite indexes required for queries
 *
 * 1. Patient Search by Name (case-insensitive)
 *    Collection: patients
 *    Fields: [fullName (ascending), createdAt (descending)]
 *
 * 2. Patient Search by Gender & Weight Range
 *    Collection: patients
 *    Fields: [gender (ascending), weight (ascending), createdAt (descending)]
 *
 * 3. Pump Sessions by Date (for a patient)
 *    Collection group: pumpSessions
 *    Fields: [patientId (ascending), infusionDate (descending), startTime (descending)]
 *
 * 4. Active Pump Sessions
 *    Collection group: pumpSessions
 *    Fields: [status (ascending), startTime (descending)]
 *
 * 5. Pump Sessions by Protocol
 *    Collection group: pumpSessions
 *    Fields: [protocolId (ascending), infusionDate (descending)]
 *
 * Create indexes in Firebase Console:
 * Firestore > Indexes > Create Index
 */

// ═══════════════════════════════════════════════════════════════════════════
// API REQUEST/RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * API error response
 */
export interface ApiError {
  code: string
  message: string
  details?: any
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  timestamp: string
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Patient with session count (for listing)
 */
export interface PatientWithStats extends PatientSearchResult {
  totalSessions: number
  totalInfusedVolume: number
  lastSession?: PumpSession
}

/**
 * Pump session with patient info (for session listing)
 */
export interface PumpSessionWithPatient extends PumpSession {
  patient: PatientSearchResult
}

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalPatients: number
  activeSessions: number
  todaySessions: number
  totalInfusedVolume: number
  recentPatients: PatientSearchResult[]
  recentSessions: PumpSessionWithPatient[]
}
