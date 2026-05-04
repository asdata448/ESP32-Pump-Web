import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  writeBatch,
  Timestamp,
  Firestore,
} from 'firebase/firestore'
import { getMessaging, getToken, Messaging, isSupported } from 'firebase/messaging'

// Firebase Configuration
// Project: esp32-firebase-2026
// Created: 2026-04-30
// Lấy config từ: Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC9XlTugbmJPh77YymSFNNPf8UORHJi2qw',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'esp32-firebase-2026.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'esp32-firebase-2026',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'esp32-firebase-2026.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '173601455015',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:173601455015:web:45c12915ffe835300cd482',
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
  stepsCompleted?: number
  stepsTotal?: number
  status: 'COMPLETED' | 'STOPPED' | 'ERROR'
  timestamp: Timestamp
  createdAt?: Timestamp
  // Optional fields
  deviceIdString?: string
  notes?: string
  errorType?: string
  // NEW: Data source tracking
  dataSource: 'demo' | 'real'
  // NEW: Sequential record number
  recordNumber?: number
}

// ═══════════════════════════════════════════════════════════════════════════
// FIREBASE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lưu bản ghi lịch sử bơm vào Firebase
 * Tự động tạo ID có thứ tự và phân loại demo/real data
 */
export async function savePumpHistory(
  record: Omit<PumpHistoryRecord, 'id' | 'timestamp' | 'createdAt' | 'recordNumber'>
): Promise<string | null> {
  try {
    const db = getFirestoreDB()

    console.log('[Firebase] Saving pump history:', record)

    // Tạo recordNumber có thứ tự
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0] // YYYY-MM-DD

    // Query đếm records của hôm nay để tạo số thứ tự
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const q = query(
      collection(db, 'pump_history'),
      where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
      where('timestamp', '<', Timestamp.fromDate(endOfDay))
    )

    const snapshot = await getDocs(q)
    const count = snapshot.size
    const recordNumber = count + 1

    // Tạo ID document có thứ tự: YYYY-MM-DD-序号
    const docId = `${dateStr}-${String(recordNumber).padStart(3, '0')}` // Ví dụ: 2026-04-30-001

    // Lọc bỏ các field undefined/null (Firebase không chấp nhận undefined)
    const cleanData: Record<string, any> = {
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
      recordNumber: recordNumber,
      // Mặc định dataSource là 'real' nếu không truyền
      dataSource: record.dataSource || 'real',
    }

    // Chỉ thêm các field có giá trị (không undefined/null)
    Object.entries(record).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        cleanData[key] = value
      }
    })

    console.log('[Firebase] Clean data to save:', cleanData)
    console.log('[Firebase] Document ID:', docId)

    // Sử dụng doc() với ID cụ thể thay vì addDoc()
    const docRef = doc(db, 'pump_history', docId)
    await setDoc(docRef, cleanData)

    console.log('[Firebase] Document saved with ID:', docId)

    return docId
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
 * Xóa TẤT CẢ bản ghi lịch sử của device hiện tại từ Firebase
 * Cẩn thận: Hành động này KHÔNG thể hoàn tác!
 */
export async function deleteAllPumpHistory(deviceId: string): Promise<boolean> {
  try {
    const db = getFirestoreDB()

    console.log('[Firebase] Deleting all pump history for device:', deviceId)

    // Query tất cả documents của device này
    const q = query(
      collection(db, 'pump_history'),
      where('deviceId', '==', deviceId)
    )

    const querySnapshot = await getDocs(q)
    const batch = writeBatch(db)

    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref)
    })

    // Commit batch delete (max 500 operations)
    await batch.commit()

    console.log('[Firebase] Deleted', querySnapshot.size, 'records')

    return true
  } catch (error) {
    console.error('[Firebase] Error deleting pump history:', error)
    return false
  }
}

/**
 * Xóa TẤT CẢ bản ghi trong collection (CHỈ DÙNG CHO DEVELOPMENT)
 * Cảnh báo: Xóa cả history của TẤT CẢ devices!
 */
export async function deleteAllPumpHistoryCollection(): Promise<boolean> {
  try {
    const db = getFirestoreDB()

    console.log('[Firebase] Deleting ALL pump history (development only!)')

    const q = query(collection(db, 'pump_history'))
    const querySnapshot = await getDocs(q)

    // Nếu có nhiều records, dùng batch
    const batchSize = 500
    for (let i = 0; i < querySnapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db)
      const end = Math.min(i + batchSize, querySnapshot.docs.length)

      for (let j = i; j < end; j++) {
        batch.delete(querySnapshot.docs[j].ref)
      }

      await batch.commit()
    }

    console.log('[Firebase] Deleted ALL', querySnapshot.size, 'records')

    return true
  } catch (error) {
    console.error('[Firebase] Error deleting ALL pump history:', error)
    return false
  }
}

/**
 * Xóa dữ liệu theo dataSource (demo hoặc real)
 * @param dataSource - 'demo' hoặc 'real'
 * @returns Số lượng bản ghi đã xóa
 */
export async function deletePumpHistoryByDataSource(
  dataSource: 'demo' | 'real'
): Promise<number> {
  try {
    const db = getFirestoreDB()

    console.log('[Firebase] Deleting pump history by dataSource:', dataSource)

    const q = query(collection(db, 'pump_history'), where('dataSource', '==', dataSource))
    const querySnapshot = await getDocs(q)

    const batchSize = 500
    let deletedCount = 0

    for (let i = 0; i < querySnapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db)
      const end = Math.min(i + batchSize, querySnapshot.docs.length)

      for (let j = i; j < end; j++) {
        batch.delete(querySnapshot.docs[j].ref)
        deletedCount++
      }

      await batch.commit()
    }

    console.log('[Firebase] Deleted', deletedCount, dataSource, 'records')

    return deletedCount
  } catch (error) {
    console.error('[Firebase] Error deleting by dataSource:', error)
    throw error
  }
}

/**
 * Lấy thống kê dữ liệu trong Firestore
 */
export async function getPumpHistoryStats(): Promise<{
  total: number
  demo: number
  real: number
  completed: number
  stopped: number
  error: number
}> {
  try {
    const db = getFirestoreDB()
    const snapshot = await getDocs(collection(db, 'pump_history'))

    const stats = {
      total: snapshot.docs.length,
      demo: 0,
      real: 0,
      completed: 0,
      stopped: 0,
      error: 0,
    }

    snapshot.docs.forEach(doc => {
      const data = doc.data()

      // Count by data source
      if (data.dataSource === 'demo') stats.demo++
      else if (data.dataSource === 'real') stats.real++

      // Count by status
      if (data.status === 'COMPLETED') stats.completed++
      else if (data.status === 'STOPPED') stats.stopped++
      else if (data.status === 'ERROR') stats.error++
    })

    return stats
  } catch (error) {
    console.error('[Firebase] Error getting stats:', error)
    return {
      total: 0,
      demo: 0,
      real: 0,
      completed: 0,
      stopped: 0,
      error: 0,
    }
  }
}

/**
 * Xóa các bản ghi cụ thể theo ID
 * @param ids - Mảng các document ID cần xóa
 * @returns Số lượng bản ghi đã xóa
 */
export async function deletePumpHistoryByIds(ids: string[]): Promise<number> {
  if (!ids || ids.length === 0) return 0

  try {
    const db = getFirestoreDB()

    console.log('[Firebase] Deleting pump history by IDs:', ids.length, 'records')

    // Firestore batch delete limit is 500 operations
    const batchSize = 500
    let deletedCount = 0

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = writeBatch(db)
      const end = Math.min(i + batchSize, ids.length)

      for (let j = i; j < end; j++) {
        const docRef = doc(db, 'pump_history', ids[j])
        batch.delete(docRef)
        deletedCount++
      }

      await batch.commit()
    }

    console.log('[Firebase] Deleted', deletedCount, 'records')

    return deletedCount
  } catch (error) {
    console.error('[Firebase] Error deleting pump history by IDs:', error)
    throw error
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
 * Kiểm tra kết nối Firebase và trả về chi tiết lỗi
 */
export async function testFirebaseConnection(): Promise<{
  success: boolean
  message: string
  details?: any
}> {
  try {
    const app = getFirebaseApp()
    const db = getFirestoreDB()

    // CHỈ TEST KẾT NỐI - không tạo document
    // Thử query collection để test connection
    const q = query(
      collection(db, 'pump_history'),
      limit(1)
    )

    await getDocs(q)
    console.log('[Firebase] Connection test successful (no data written)')

    return {
      success: true,
      message: 'Kết nối Firebase thành công!',
      details: { timestamp: new Date().toISOString() },
    }
  } catch (error: any) {
    console.error('[Firebase] Connection test failed:', error)

    // Phân tích lỗi để đưa ra thông báo chi tiết
    let message = 'Lỗi kết nối Firebase'
    let details: any = { code: error?.code, message: error?.message }

    if (error?.code === 'permission-denied') {
      message = 'Lỗi quyền truy cập Firebase! Vui lòng kiểm tra Firestore Security Rules.'
      details.hint = 'Vào Firebase Console → Firestore Database → Rules → Đặt thành: allow read, write: if true;'
    } else if (error?.code === 'not-found') {
      message = 'Chưa tạo Firestore Database! Vui lòng tạo Firestore Database trong Firebase Console.'
      details.hint = 'Vào Firebase Console → Firestore Database → Create Database'
    } else if (error?.message?.includes('network')) {
      message = 'Lỗi mạng! Kiểm tra kết nối internet.'
    }

    return {
      success: false,
      message,
      details,
    }
  }
}

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
 * Returns a PumpHistoryRecord-compatible object for FirebaseHistoryPanel
 */
export function formatHistoryRecord(record: PumpHistoryRecord): PumpHistoryRecord {
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

  // Return the original record with timestamp as a string for display
  // Keep all fields in the original format expected by the panel
  return {
    ...record,
    timestamp: formatFirebaseTimestamp(record.timestamp),
    createdAt: createdAtDate as any, // Keep as Date for local filtering if needed
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
  stepsCompleted?: number
  stepsTotal?: number
  status: 'COMPLETED' | 'STOPPED' | 'ERROR'
  deviceId: string
  notes?: string
  errorType?: string
}): Omit<PumpHistoryRecord, 'id' | 'timestamp' | 'createdAt'> {
  const cleanData: Omit<PumpHistoryRecord, 'id' | 'timestamp' | 'createdAt' | 'stepsCompleted' | 'stepsTotal'> = {
    syringeType: data.syringeType || '10CC',
    speedMlh: data.speedMlh ?? 0,
    volumeMl: data.volumeMl ?? 0,
    infusedVolumeMl: data.infusedVolumeMl ?? 0,
    totalTimeSec: data.totalTimeSec ?? 0,
    status: data.status,
    deviceId: data.deviceId,
  }

  // Optional fields - chỉ thêm khi có giá trị
  if (data.stepsCompleted !== undefined) {
    cleanData.stepsCompleted = data.stepsCompleted
  }
  if (data.stepsTotal !== undefined) {
    cleanData.stepsTotal = data.stepsTotal
  }
  if (data.notes) {
    cleanData.notes = data.notes
  }
  if (data.errorType) {
    cleanData.errorType = data.errorType
  }

  return cleanData
}

