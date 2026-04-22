import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
  Firestore,
} from 'firebase/firestore'
import { getMessaging, getToken, Messaging, isSupported } from 'firebase/messaging'

// Firebase Configuration
// Bạn cần thay thế các giá trị này bằng config Firebase project của bạn
// Lấy từ: Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDemo-ApiKey-Replace-This',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'esp32-pump-tracker',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
}

// Initialize Firebase (singleton pattern)
let app: FirebaseApp | null = null
let db: Firestore | null = null

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0]
  }
  return app
}

export function getFirestoreDB(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp())
  }
  return db
}

// ═══════════════════════════════════════════════════════════════════════════
// PUMP HISTORY TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PumpHistoryRecord {
  id?: string
  deviceId: string
  syringeType: string
  speedMlh: number
  volumeMl: number
  infusedVolumeMl: number
  totalTimeSec: number
  status: 'COMPLETED' | 'STOPPED' | 'ERROR'
  timestamp: Timestamp
  createdAt?: Timestamp
  // Optional fields
  deviceIdString?: string
  notes?: string
  errorType?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// FIREBASE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lưu bản ghi lịch sử bơm vào Firebase
 * Tự động lọc bỏ các field undefined/null để tránh lỗi Firebase
 */
export async function savePumpHistory(
  record: Omit<PumpHistoryRecord, 'id' | 'timestamp' | 'createdAt'>
): Promise<string | null> {
  try {
    const db = getFirestoreDB()

    console.log('[Firebase] Saving pump history:', record)

    // Lọc bỏ các field undefined/null (Firebase không chấp nhận undefined)
    const cleanData: Record<string, any> = {
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
    }

    // Chỉ thêm các field có giá trị (không undefined/null)
    Object.entries(record).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        cleanData[key] = value
      }
    })

    console.log('[Firebase] Clean data to save:', cleanData)

    const docRef = await addDoc(collection(db, 'pump_history'), cleanData)

    console.log('[Firebase] Document saved with ID:', docRef.id)

    return docRef.id
  } catch (error) {
    console.error('[Firebase] Error saving pump history:', error)
    return null
  }
}

/**
 * Subscribe để nhận real-time updates từ Firebase
 * Returns unsubscribe function
 */
export function subscribeToPumpHistory(
  deviceId: string,
  callback: (records: PumpHistoryRecord[]) => void,
  limitCount: number = 50
): () => void {
  try {
    const db = getFirestoreDB()

    console.log('[Firebase] Subscribing to pump_history for device:', deviceId)

    const q = query(
      collection(db, 'pump_history'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records: PumpHistoryRecord[] = []
        snapshot.forEach((doc) => {
          const data = doc.data({ serverTimestamps: 'estimate' }) as any
          records.push({
            id: doc.id,
            ...data,
          })
        })

        console.log('[Firebase] Received records:', records.length)
        console.log('[Firebase] Sample record:', records[0])

        callback(records)
      },
      (error) => {
        console.error('[Firebase] Error listening to pump history:', error)
        callback([])
      }
    )

    return unsubscribe
  } catch (error) {
    console.error('[Firebase] Error subscribing to pump history:', error)
    return () => {}
  }
}

/**
 * Lấy FCM token cho push notifications
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const supported = await isSupported()
    if (!supported) {
      console.log('FCM not supported in this browser')
      return null
    }

    const messaging = getMessaging(getFirebaseApp())
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    })
    return token
  } catch (error) {
    console.error('Error getting FCM token:', error)
    return null
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const supported = await isSupported()
    if (!supported) return false

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format Timestamp to readable string
 * Supports multiple formats: Timestamp object, ISO string, milliseconds, or {seconds, nanoseconds}
 */
export function formatFirebaseTimestamp(timestamp: any): string {
  if (!timestamp) return '-'

  try {
    let date: Date

    // Case 1: Timestamp object with toDate() method
    if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate()
    }
    // Case 2: String (ISO format)
    else if (typeof timestamp === 'string') {
      date = new Date(timestamp)
    }
    // Case 3: Number (milliseconds)
    else if (typeof timestamp === 'number') {
      date = new Date(timestamp)
    }
    // Case 4: Object with seconds and nanoseconds
    else if (timestamp.seconds !== undefined) {
      const nanos = timestamp.nanoseconds || 0
      date = new Date(timestamp.seconds * 1000 + nanos / 1000000)
    }
    // Case 5: Unknown format, try to convert
    else {
      date = new Date(timestamp as any)
    }

    // Check if date is valid
    if (isNaN(date.getTime())) return '-'

    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${day}/${month} ${hours}:${minutes}`
  } catch (error) {
    console.error('Error formatting timestamp:', error, timestamp)
    return '-'
  }
}

/**
 * Convert PumpHistoryRecord to display format
 */
export function formatHistoryRecord(record: PumpHistoryRecord) {
  // Convert createdAt timestamp to Date object
  let createdAtDate: Date
  if (!record.createdAt) {
    createdAtDate = new Date()
  } else if (typeof record.createdAt.toDate === 'function') {
    createdAtDate = record.createdAt.toDate()
  } else if (typeof record.createdAt === 'string') {
    createdAtDate = new Date(record.createdAt)
  } else if (typeof record.createdAt === 'number') {
    createdAtDate = new Date(record.createdAt)
  } else if (record.createdAt.seconds !== undefined) {
    const nanos = record.createdAt.nanoseconds || 0
    createdAtDate = new Date(record.createdAt.seconds * 1000 + nanos / 1000000)
  } else {
    createdAtDate = new Date()
  }

  return {
    id: record.id,
    syringe: record.syringeType,
    speed_mlh: record.speedMlh,
    volume_ml: record.volumeMl,
    infused_ml: record.infusedVolumeMl,
    total_sec: record.totalTimeSec,
    status: record.status,
    timestamp: formatFirebaseTimestamp(record.timestamp),
    createdAt: createdAtDate,
  }
}

/**
 * Tạo PumpHistoryRecord sạch từ dữ liệu thô
 * Tự động lọc bỏ các field undefined/null
 * Dùng cho cả demo và ESP32 connection
 */
export function createPumpHistoryRecord(data: {
  syringeType: string
  speedMlh: number
  volumeMl: number
  infusedVolumeMl: number
  totalTimeSec: number
  status: 'COMPLETED' | 'STOPPED' | 'ERROR'
  deviceId: string
  notes?: string
  errorType?: string
}): Omit<PumpHistoryRecord, 'id' | 'timestamp' | 'createdAt'> {
  const cleanData: Omit<PumpHistoryRecord, 'id' | 'timestamp' | 'createdAt'> = {
    syringeType: data.syringeType || '10CC',
    speedMlh: data.speedMlh ?? 0,
    volumeMl: data.volumeMl ?? 0,
    infusedVolumeMl: data.infusedVolumeMl ?? 0,
    totalTimeSec: data.totalTimeSec ?? 0,
    status: data.status,
    deviceId: data.deviceId,
  }

  // Chỉ thêm optional fields khi có giá trị
  if (data.notes) {
    cleanData.notes = data.notes
  }
  if (data.errorType) {
    cleanData.errorType = data.errorType
  }

  return cleanData
}

