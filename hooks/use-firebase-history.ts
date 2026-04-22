'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  savePumpHistory,
  subscribeToPumpHistory,
  requestNotificationPermission,
  getFCMToken,
  formatHistoryRecord,
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
}

export function useFirebaseHistory({
  deviceId,
  enabled = true,
  limit = 50,
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
    async (record: Omit<PumpHistoryRecord, 'id' | 'timestamp' | 'createdAt' | 'deviceId'>) => {
      if (!enabled) return null

      try {
        const docId = await savePumpHistory({
          ...record,
          deviceId,
        })
        return docId
      } catch (err) {
        console.error('Error saving record:', err)
        setError('Không thể lưu lịch sử')
        return null
      }
    },
    [deviceId, enabled]
  )

  // Clear local history (doesn't delete from Firebase)
  const clearLocalHistory = useCallback(() => {
    setHistory([])
  }, [])

  return {
    history,
    loading,
    error,
    notificationPermission,
    fcmToken,
    saveRecord,
    clearLocalHistory,
    requestPermission,
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
