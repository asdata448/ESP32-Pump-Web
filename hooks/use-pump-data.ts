'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import useSWR from 'swr'
import type { PumpStatus, PumpConfig, HistoryEntry, FSRDataPoint, ProgressDataPoint } from '@/lib/pump-types'
import { DEFAULT_STATUS, DEFAULT_CONFIG, calculateProgress, calculateInfusedVolume } from '@/lib/pump-types'

const STATUS_POLL_INTERVAL = 1000 // 1 second
const HISTORY_POLL_INTERVAL = 3000 // 3 seconds
const FSR_HISTORY_LENGTH = 60 // Keep last 60 data points

// Fetcher for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function usePumpData() {
  const [isConnected, setIsConnected] = useState(false)
  const [isDemo, setIsDemo] = useState(true)
  const [baseUrl, setBaseUrl] = useState('')
  const [fsrHistory, setFsrHistory] = useState<FSRDataPoint[]>([])
  const [progressHistory, setProgressHistory] = useState<ProgressDataPoint[]>([])
  const lastFsrUpdate = useRef<number>(0)
  const lastProgressUpdate = useRef<number>(0)

  // Load base URL from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem('esp32_base_url') || ''
    setBaseUrl(savedUrl)
  }, [])

  // Determine API URL - use local mock API in demo mode
  const apiBase = isDemo ? '' : baseUrl

  // SWR for status
  const { 
    data: status, 
    error: statusError, 
    isLoading: statusLoading,
    mutate: mutateStatus 
  } = useSWR<PumpStatus>(
    `${apiBase}/api/status`,
    fetcher,
    { 
      refreshInterval: STATUS_POLL_INTERVAL,
      revalidateOnFocus: false,
      onError: () => {
        if (!isDemo) setIsConnected(false)
      },
      onSuccess: () => {
        setIsConnected(true)
      }
    }
  )

  // SWR for history
  const { 
    data: history,
    mutate: mutateHistory 
  } = useSWR<HistoryEntry[]>(
    `${apiBase}/api/history`,
    fetcher,
    { 
      refreshInterval: HISTORY_POLL_INTERVAL,
      revalidateOnFocus: false 
    }
  )

  // Update FSR history when status changes
  useEffect(() => {
    if (status && Date.now() - lastFsrUpdate.current >= 500) {
      lastFsrUpdate.current = Date.now()
      setFsrHistory(prev => {
        const newPoint: FSRDataPoint = {
          time: Date.now(),
          value: status.fsr_raw
        }
        const updated = [...prev, newPoint]
        return updated.slice(-FSR_HISTORY_LENGTH)
      })
    }
  }, [status])

  // Update progress history when pump is running
  useEffect(() => {
    if (status?.pump_running && Date.now() - lastProgressUpdate.current >= 3000) {
      lastProgressUpdate.current = Date.now()
      setProgressHistory(prev => {
        const progress = calculateProgress(status.steps_completed, status.steps_total)
        const volume = calculateInfusedVolume(status.steps_completed, status.steps_total, status.volume_ml)
        const newPoint: ProgressDataPoint = {
          time: Date.now(),
          progress,
          volume
        }
        const updated = [...prev, newPoint]
        return updated.slice(-20)
      })
    }
  }, [status])

  // Reset progress history when pump starts
  useEffect(() => {
    if (status?.state === 'READY' || status?.state === 'PREPARE') {
      setProgressHistory([])
    }
  }, [status?.state])

  // API Actions
  const saveConfig = useCallback(async (config: PumpConfig) => {
    const response = await fetch(`${apiBase}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    if (!response.ok) throw new Error('Failed to save config')
    mutateStatus()
    return response.json()
  }, [apiBase, mutateStatus])

  const prepare = useCallback(async () => {
    const response = await fetch(`${apiBase}/api/prepare`, { method: 'POST' })
    if (!response.ok) throw new Error('Failed to prepare')
    mutateStatus()
    return response.json()
  }, [apiBase, mutateStatus])

  const start = useCallback(async () => {
    const response = await fetch(`${apiBase}/api/start`, { method: 'POST' })
    if (!response.ok) throw new Error('Failed to start')
    mutateStatus()
    return response.json()
  }, [apiBase, mutateStatus])

  const pause = useCallback(async () => {
    const response = await fetch(`${apiBase}/api/pause`, { method: 'POST' })
    if (!response.ok) throw new Error('Failed to pause')
    mutateStatus()
    return response.json()
  }, [apiBase, mutateStatus])

  const resume = useCallback(async () => {
    const response = await fetch(`${apiBase}/api/resume`, { method: 'POST' })
    if (!response.ok) throw new Error('Failed to resume')
    mutateStatus()
    return response.json()
  }, [apiBase, mutateStatus])

  const stop = useCallback(async () => {
    const response = await fetch(`${apiBase}/api/stop`, { method: 'POST' })
    if (!response.ok) throw new Error('Failed to stop')
    mutateStatus()
    return response.json()
  }, [apiBase, mutateStatus])

  const rehome = useCallback(async () => {
    const response = await fetch(`${apiBase}/api/rehome`, { method: 'POST' })
    if (!response.ok) throw new Error('Failed to rehome')
    mutateStatus()
    return response.json()
  }, [apiBase, mutateStatus])

  const resetAlarm = useCallback(async () => {
    const response = await fetch(`${apiBase}/api/reset_alarm`, { method: 'POST' })
    if (!response.ok) throw new Error('Failed to reset alarm')
    mutateStatus()
    return response.json()
  }, [apiBase, mutateStatus])

  const testConnection = useCallback(async (url: string) => {
    try {
      const response = await fetch(`${url}/api/status`, {
        signal: AbortSignal.timeout(3000)
      })
      return response.ok
    } catch {
      return false
    }
  }, [])

  const connectToESP32 = useCallback(async (url: string) => {
    const success = await testConnection(url)
    if (success) {
      localStorage.setItem('esp32_base_url', url)
      setBaseUrl(url)
      setIsDemo(false)
      setIsConnected(true)
      mutateStatus()
      mutateHistory()
    }
    return success
  }, [testConnection, mutateStatus, mutateHistory])

  const disconnectESP32 = useCallback(() => {
    setIsDemo(true)
    setIsConnected(false)
    mutateStatus()
    mutateHistory()
  }, [mutateStatus, mutateHistory])

  return {
    // State
    status: status || DEFAULT_STATUS,
    history: history || [],
    isConnected: isDemo || isConnected,
    isDemo,
    isLoading: statusLoading,
    hasError: !!statusError && !isDemo,
    baseUrl,
    fsrHistory,
    progressHistory,

    // Actions
    saveConfig,
    prepare,
    start,
    pause,
    resume,
    stop,
    rehome,
    resetAlarm,
    testConnection,
    connectToESP32,
    disconnectESP32,
  }
}
