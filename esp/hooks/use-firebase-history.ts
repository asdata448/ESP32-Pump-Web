'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  savePumpHistory,
  subscribeToPumpHistory,
  requestNotificationPermission,
  getFCMToken,
  formatHistoryRecord,
  deleteAllPumpHistory,
  deleteAllPumpHistoryCollection,
  deletePumpHistoryByIds,
  deletePumpHistoryByDataSource,
  getPumpHistoryStats,
  testFirebaseConnection,
  type PumpHistoryRecord,
} from '@/lib/firebase'

interface FormattedHistoryRecord {
  id?: string
  syringe: string
  speed_mlh: number
  volume_ml: number
  infused_ml: number
  total_sec: number
  status: 'COMPLETED' | 'STOPPED' | 'ERROR'
  timestamp: string
  createdAt: Date
}

interface UseFirebaseHistoryOptions {
  deviceId: string
  enabled?: boolean
  limit?: number
  dataSource?: 'demo' | 'real' // Thêm option để chỉ định data source
}

export function useFirebaseHistory({
  deviceId,
  enabled = true,
  limit = 50,
  dataSource = 'real', // Mặc định là 'real' data
}: UseFirebaseHistoryOptions) {
  const [history, setHistory] = useState<FormattedHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [fcmToken, setFcmToken] = useState<string | null>(null)

  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Subscribe to real-time history updates
  useEffect(() => {
    if (!enabled || !deviceId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      unsubscribeRef.current = subscribeToPumpHistory(
        deviceId,
        (records) => {
          const formatted = records.map(formatHistoryRecord)
          setHistory(formatted)
          setLoading(false)
        },
        limit
      )
    } catch (err) {
      console.error('Error subscribing to history:', err)
      setError('Không thể kết nối Firebase')
      setLoading(false)
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [deviceId, enabled, limit])

  // Request notification permission
  const requestPermission = useCallback(async () => {
    const granted = await requestNotificationPermission()
    setNotificationPermission(granted ? 'granted' : 'denied')

    if (granted) {
      const token = await getFCMToken()
      setFcmToken(token)
    }

    return granted
  }, [])

  // Save new record to history
  const saveRecord = useCallback(
    async (record: Omit<PumpHistoryRecord, 'id' | 'timestamp' | 'createdAt' | 'deviceId' | 'dataSource' | 'recordNumber'>) => {
      if (!enabled) return null

      try {
        const docId = await savePumpHistory({
          ...record,
          deviceId,
          dataSource: dataSource, // Sử dụng dataSource từ options
        })
        return docId
      } catch (err) {
        console.error('Error saving record:', err)
        setError('Không thể lưu lịch sử')
        return null
      }
    },
    [deviceId, enabled, dataSource]
  )

  // Clear local history (doesn't delete from Firebase)
  const clearLocalHistory = useCallback(() => {
    setHistory([])
  }, [])

  // Delete ALL history from Firebase collection (PERMANENT - deletes ALL devices!)
  const deleteAllHistory = useCallback(async () => {
    const success = await deleteAllPumpHistoryCollection()
    if (success) {
      setHistory([])
    }
    return success
  }, [])

  // Delete ALL history from Firebase collection (DEVELOPMENT ONLY!)
  const deleteAllHistoryCollection = useCallback(async () => {
    return await deleteAllPumpHistoryCollection()
  }, [])

  // Delete specific records by IDs
  const deleteSelectedHistory = useCallback(async (ids: string[]) => {
    if (!enabled || ids.length === 0) return 0

    try {
      const deletedCount = await deletePumpHistoryByIds(ids)

      // Update local state by removing deleted records
      setHistory((prev) => prev.filter((record) => !ids.includes(record.id || '')))

      return deletedCount
    } catch (err) {
      console.error('Error deleting selected records:', err)
      setError('Không thể xóa các bản ghi đã chọn')
      return 0
    }
  }, [enabled])

  // Test Firebase connection
  const testConnection = useCallback(async () => {
    return await testFirebaseConnection()
  }, [])

  // Delete by data source (demo or real)
  const deleteByDataSource = useCallback(async (source: 'demo' | 'real') => {
    const count = await deletePumpHistoryByDataSource(source)
    if (count > 0) {
      setHistory((prev) => prev.filter((r) => r.dataSource !== source))
    }
    return count
  }, [])

  // Get statistics
  const getStats = useCallback(async () => {
    return await getPumpHistoryStats()
  }, [])

  return {
    history,
    loading,
    error,
    notificationPermission,
    fcmToken,
    saveRecord,
    clearLocalHistory,
    deleteAllHistory,
    deleteAllHistoryCollection,
    deleteSelectedHistory,
    deleteByDataSource,
    getStats,
    requestPermission,
    testConnection,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEMO MODE HOOK (uses localStorage instead of Firebase)
// ═══════════════════════════════════════════════════════════════════════════

const DEMO_HISTORY_KEY = 'pump_demo_history_v2'

interface DemoHistoryRecord {
  id: string
  syringe: string
  speed_mlh: number
  volume_ml: number
  infused_ml: number
  total_sec: number
  status: 'COMPLETED' | 'STOPPED' | 'ERROR'
  timestamp: string
  createdAt: number
}

export function useDemoHistory() {
  const [history, setHistory] = useState<DemoHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DEMO_HISTORY_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setHistory(parsed)
      }
    } catch (err) {
      console.error('Error loading demo history:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Save to localStorage
  const saveRecord = useCallback((record: Omit<DemoHistoryRecord, 'id' | 'timestamp' | 'createdAt'>) => {
    const newRecord: DemoHistoryRecord = {
      ...record,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('vi-VN'),
      createdAt: Date.now(),
    }

    setHistory((prev) => {
      const updated = [newRecord, ...prev].slice(0, 50) // Keep max 50 records
      try {
        localStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(updated))
      } catch (err) {
        console.error('Error saving demo history:', err)
      }
      return updated
    })

    return newRecord.id
  }, [])

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem(DEMO_HISTORY_KEY)
  }, [])

  return {
    history,
    loading,
    saveRecord,
    clearHistory,
  }
}
