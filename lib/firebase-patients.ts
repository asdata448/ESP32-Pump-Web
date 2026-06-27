// ═══════════════════════════════════════════════════════════════════════════
// FIREBASE PATIENT MANAGEMENT - Firestore Integration
// ═══════════════════════════════════════════════════════════════════════════
// Firebase Firestore operations for patient and pump session management
//
// Features:
// - Patient CRUD operations
// - Pump session CRUD operations
// - Patient search and filtering
// - Real-time subscriptions
// - Batch operations
// ═══════════════════════════════════════════════════════════════════════════

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  writeBatch,
  Firestore,
  CollectionReference,
  Query,
} from 'firebase/firestore'

import { getFirestoreDB } from './firebase'
import type {
  Patient,
  PatientRegistrationForm,
  PatientSearchResult,
  PatientSearchQuery,
  PumpSession,
  PumpSessionCreate,
  PumpSessionUpdate,
} from './patient-types'

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert Firestore document to Patient object
 */
function docToPatient(doc: QueryDocumentSnapshot<DocumentData>): Patient {
  const data = doc.data()
  return {
    id: doc.id,
    patientId: data.patientId,
    fullName: data.fullName,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    weight: data.weight,
    metadata: data.metadata,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

/**
 * Convert Firestore document to PumpSession object
 */
function docToPumpSession(doc: QueryDocumentSnapshot<DocumentData>): PumpSession {
  const data = doc.data()
  return {
    id: doc.id,
    sessionNumber: data.sessionNumber,
    patientId: data.patientId,
    pumpId: data.pumpId,
    infusionDate: data.infusionDate,
    startTime: data.startTime,
    endTime: data.endTime,
    configuredRate: data.configuredRate,
    configuredVolume: data.configuredVolume,
    infusedVolume: data.infusedVolume,
    remainingVolume: data.remainingVolume,
    status: data.status,
    durationSeconds: data.durationSeconds,
    durationFormatted: data.durationFormatted,
    protocolId: data.protocolId,
    protocolName: data.protocolName,
    syringeType: data.syringeType,
    notes: data.notes,
    errorDetails: data.errorDetails,
    stoppedBy: data.stoppedBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

/**
 * Clean data for Firestore (remove undefined values)
 */
function cleanData(data: any): any {
  const cleaned: any = {}
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      cleaned[key] = value
    }
  })
  return cleaned
}

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Register a new patient in Firestore
 * @param formData - Patient registration form data
 * @returns The created patient document
 */
export async function createPatientInFirestore(
  formData: PatientRegistrationForm & { patientId: string }
): Promise<Patient | null> {
  try {
    const db = getFirestoreDB()
    const patientsRef = collection(db, 'patients')

    const now = new Date().toISOString()
    const patientData = cleanData({
      patientId: formData.patientId,
      fullName: formData.fullName.trim(),
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      weight: formData.weight,
      metadata: {
        registrationSource: 'WEB',
        registeredAt: now,
      },
      createdAt: now,
      updatedAt: now,
    })

    // Create document with patientId as document ID
    const docRef = doc(patientsRef, formData.patientId)
    await setDoc(docRef, patientData)

    // Return the created patient
    return {
      id: formData.patientId,
      ...patientData,
    } as Patient
  } catch (error) {
    console.error('[Firebase Patients] Error creating patient:', error)
    throw error
  }
}

/**
 * Get patient by ID from Firestore
 * @param patientId - Patient ID (e.g., "BN-150590-123456")
 * @returns Patient document or null if not found
 */
export async function getPatientFromFirestore(
  patientId: string
): Promise<Patient | null> {
  try {
    const db = getFirestoreDB()
    const docRef = doc(db, 'patients', patientId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return docToPatient(docSnap)
  } catch (error) {
    console.error('[Firebase Patients] Error getting patient:', error)
    throw error
  }
}

/**
 * Update patient in Firestore
 * @param patientId - Patient ID
 * @param updates - Partial patient data to update
 * @returns Updated patient document
 */
export async function updatePatientInFirestore(
  patientId: string,
  updates: Partial<Omit<Patient, 'id' | 'patientId' | 'createdAt'>>
): Promise<Patient | null> {
  try {
    const db = getFirestoreDB()
    const docRef = doc(db, 'patients', patientId)

    const updateData = cleanData({
      ...updates,
      updatedAt: new Date().toISOString(),
    })

    await updateDoc(docRef, updateData)

    // Fetch and return updated document
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) {
      return null
    }

    return docToPatient(docSnap)
  } catch (error) {
    console.error('[Firebase Patients] Error updating patient:', error)
    throw error
  }
}

/**
 * Delete patient from Firestore
 * @param patientId - Patient ID
 * @returns true if deleted successfully
 */
export async function deletePatientFromFirestore(
  patientId: string
): Promise<boolean> {
  try {
    const db = getFirestoreDB()

    // Delete all pump sessions for this patient first
    const sessionsRef = collection(db, 'patients', patientId, 'pumpSessions')
    const sessionsSnapshot = await getDocs(sessionsRef)

    // Batch delete sessions (max 500 operations)
    const batchSize = 500
    for (let i = 0; i < sessionsSnapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db)
      const end = Math.min(i + batchSize, sessionsSnapshot.docs.length)

      for (let j = i; j < end; j++) {
        batch.delete(sessionsSnapshot.docs[j].ref)
      }

      await batch.commit()
    }

    // Delete patient document
    const patientRef = doc(db, 'patients', patientId)
    await deleteDoc(patientRef)

    console.log(`[Firebase Patients] Deleted patient ${patientId} and ${sessionsSnapshot.docs.length} sessions`)
    return true
  } catch (error) {
    console.error('[Firebase Patients] Error deleting patient:', error)
    throw error
  }
}

/**
 * Search patients with filters
 * @param searchQuery - Search query parameters
 * @returns Search results with pagination
 */
export async function searchPatientsInFirestore(
  searchQuery: PatientSearchQuery
): Promise<{ results: PatientSearchResult[]; total: number }> {
  try {
    const db = getFirestoreDB()
    const patientsRef = collection(db, 'patients')

    // Build query
    let q: Query = patientsRef

    // Apply filters
    const constraints: any[] = []

    // Gender filter
    if (searchQuery.gender) {
      constraints.push(where('gender', '==', searchQuery.gender))
    }

    // Weight range filters
    if (searchQuery.minWeight !== undefined) {
      constraints.push(where('weight', '>=', searchQuery.minWeight))
    }
    if (searchQuery.maxWeight !== undefined) {
      constraints.push(where('weight', '<=', searchQuery.maxWeight))
    }

    // Always sort by createdAt descending
    constraints.push(orderBy('createdAt', 'desc'))

    // Apply limit for pagination
    const fetchLimit = (searchQuery.limit || 50) + (searchQuery.offset || 0) + 1
    constraints.push(limit(fetchLimit))

    if (constraints.length > 0) {
      q = query(patientsRef, ...constraints)
    }

    // Execute query
    const snapshot = await getDocs(q)
    let patients = snapshot.docs.map(docToPatient)

    // Apply search term filter (client-side for now)
    if (searchQuery.searchTerm) {
      const term = searchQuery.searchTerm.toLowerCase()
      patients = patients.filter(
        (p) =>
          p.patientId.toLowerCase().includes(term) ||
          p.fullName.toLowerCase().includes(term)
      )
    }

    // Calculate total
    const total = patients.length

    // Apply pagination
    const offset = searchQuery.offset || 0
    const limitCount = searchQuery.limit || 50
    const paginatedPatients = patients.slice(offset, offset + limitCount)

    // Transform to search results
    const results: PatientSearchResult[] = paginatedPatients.map((p) => ({
      patientId: p.patientId,
      fullName: p.fullName,
      dateOfBirth: p.dateOfBirth,
      gender: p.gender,
      weight: p.weight,
    }))

    return { results, total }
  } catch (error) {
    console.error('[Firebase Patients] Error searching patients:', error)
    throw error
  }
}

/**
 * Get all patients (for admin/debug purposes)
 * @returns Array of all patients
 */
export async function getAllPatientsFromFirestore(): Promise<Patient[]> {
  try {
    const db = getFirestoreDB()
    const patientsRef = collection(db, 'patients')
    const q = query(patientsRef, orderBy('createdAt', 'desc'), limit(100))
    const snapshot = await getDocs(q)

    return snapshot.docs.map(docToPatient)
  } catch (error) {
    console.error('[Firebase Patients] Error getting all patients:', error)
    throw error
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUMP SESSION OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a new pump session for a patient
 * @param patientId - Patient ID
 * @param sessionData - Pump session data
 * @param sessionNumber - Session number for this patient
 * @returns Created pump session
 */
export async function createPumpSessionInFirestore(
  patientId: string,
  sessionData: PumpSessionCreate,
  sessionNumber: number
): Promise<PumpSession | null> {
  try {
    const db = getFirestoreDB()
    const sessionsRef = collection(db, 'patients', patientId, 'pumpSessions')

    const now = new Date().toISOString()
    const sessionCleanData = cleanData({
      sessionNumber,
      patientId,
      pumpId: sessionData.pumpId,
      infusionDate: sessionData.infusionDate,
      startTime: sessionData.startTime,
      configuredRate: sessionData.configuredRate,
      configuredVolume: sessionData.configuredVolume,
      infusedVolume: 0,
      remainingVolume: sessionData.configuredVolume,
      status: 'SCHEDULED',
      protocolId: sessionData.protocolId,
      protocolName: sessionData.protocolName,
      syringeType: sessionData.syringeType,
      notes: sessionData.notes,
      createdAt: now,
      updatedAt: now,
    })

    // Create document with session number as ID
    const docRef = doc(sessionsRef, sessionNumber.toString())
    await setDoc(docRef, sessionCleanData)

    return {
      id: sessionNumber.toString(),
      ...sessionCleanData,
    } as PumpSession
  } catch (error) {
    console.error('[Firebase Patients] Error creating pump session:', error)
    throw error
  }
}

/**
 * Get pump sessions for a patient
 * @param patientId - Patient ID
 * @param statusFilter - Optional status filter
 * @param limit - Maximum number of sessions to return
 * @returns Array of pump sessions
 */
export async function getPumpSessionsFromFirestore(
  patientId: string,
  statusFilter?: string,
  limitCount: number = 50
): Promise<PumpSession[]> {
  try {
    const db = getFirestoreDB()
    const sessionsRef = collection(db, 'patients', patientId, 'pumpSessions')

    // Build query
    let q: Query = sessionsRef

    const constraints: any[] = [
      orderBy('sessionNumber', 'desc'),
      limit(limitCount),
    ]

    if (statusFilter) {
      constraints.unshift(where('status', '==', statusFilter))
    }

    q = query(sessionsRef, ...constraints)

    const snapshot = await getDocs(q)
    return snapshot.docs.map(docToPumpSession)
  } catch (error) {
    console.error('[Firebase Patients] Error getting pump sessions:', error)
    throw error
  }
}

/**
 * Get a specific pump session
 * @param patientId - Patient ID
 * @param sessionId - Session ID (session number as string)
 * @returns Pump session or null if not found
 */
export async function getPumpSessionFromFirestore(
  patientId: string,
  sessionId: string
): Promise<PumpSession | null> {
  try {
    const db = getFirestoreDB()
    const docRef = doc(db, 'patients', patientId, 'pumpSessions', sessionId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return docToPumpSession(docSnap)
  } catch (error) {
    console.error('[Firebase Patients] Error getting pump session:', error)
    throw error
  }
}

/**
 * Update a pump session
 * @param patientId - Patient ID
 * @param sessionId - Session ID
 * @param updates - Partial session data to update
 * @returns Updated pump session
 */
export async function updatePumpSessionInFirestore(
  patientId: string,
  sessionId: string,
  updates: PumpSessionUpdate
): Promise<PumpSession | null> {
  try {
    const db = getFirestoreDB()
    const docRef = doc(db, 'patients', patientId, 'pumpSessions', sessionId)

    const updateData = cleanData({
      ...updates,
      updatedAt: new Date().toISOString(),
    })

    await updateDoc(docRef, updateData)

    // Fetch and return updated document
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) {
      return null
    }

    return docToPumpSession(docSnap)
  } catch (error) {
    console.error('[Firebase Patients] Error updating pump session:', error)
    throw error
  }
}

/**
 * Delete a pump session
 * @param patientId - Patient ID
 * @param sessionId - Session ID
 * @returns true if deleted successfully
 */
export async function deletePumpSessionFromFirestore(
  patientId: string,
  sessionId: string
): Promise<boolean> {
  try {
    const db = getFirestoreDB()
    const docRef = doc(db, 'patients', patientId, 'pumpSessions', sessionId)
    await deleteDoc(docRef)

    console.log(`[Firebase Patients] Deleted session ${sessionId} for patient ${patientId}`)
    return true
  } catch (error) {
    console.error('[Firebase Patients] Error deleting pump session:', error)
    throw error
  }
}

/**
 * Get session count for a patient
 * @param patientId - Patient ID
 * @returns Number of sessions
 */
export async function getPatientSessionCount(
  patientId: string
): Promise<number> {
  try {
    const db = getFirestoreDB()
    const sessionsRef = collection(db, 'patients', patientId, 'pumpSessions')
    const snapshot = await getDocs(sessionsRef)

    return snapshot.docs.length
  } catch (error) {
    console.error('[Firebase Patients] Error getting session count:', error)
    return 0
  }
}

/**
 * Get next session number for a patient
 * @param patientId - Patient ID
 * @returns Next session number (current count + 1)
 */
export async function getNextSessionNumber(
  patientId: string
): Promise<number> {
  try {
    const count = await getPatientSessionCount(patientId)
    return count + 1
  } catch (error) {
    console.error('[Firebase Patients] Error getting next session number:', error)
    return 1
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a patient exists
 * @param patientId - Patient ID
 * @returns true if patient exists
 */
export async function patientExists(
  patientId: string
): Promise<boolean> {
  try {
    const patient = await getPatientFromFirestore(patientId)
    return patient !== null
  } catch (error) {
    console.error('[Firebase Patients] Error checking patient existence:', error)
    return false
  }
}

/**
 * Get total infused volume for a patient
 * @param patientId - Patient ID
 * @returns Total infused volume from all completed sessions
 */
export async function getTotalInfusedVolume(
  patientId: string
): Promise<number> {
  try {
    const sessions = await getPumpSessionsFromFirestore(patientId, 'COMPLETED', 500)
    const total = sessions.reduce((sum, session) => sum + session.infusedVolume, 0)
    return Number(total.toFixed(2))
  } catch (error) {
    console.error('[Firebase Patients] Error calculating total infused volume:', error)
    return 0
  }
}
