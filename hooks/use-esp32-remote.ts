/**
 * Hook for Remote ESP32 Control via Firebase Realtime Database
 * Provides the same interface as use-esp32.ts but uses Firebase
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createRemotePumpAPI, type RemotePumpAPI } from '@/lib/pump-api-remote'
import type { PumpStatus, PumpConfig } from '@/lib/pump-types'

interface UseESP32RemoteOptions {
  deviceId: string
  enabled?: boolean
}

export function useESP32Remote({ deviceId, enabled = true }: UseESP32RemoteOptions) {
  const [status, setStatus] = useState<PumpStatus | null>(null)
  const [config, setConfig] = useState<PumpConfig>({
    syringe_index: 0,
    speed_mlh: 1.0,
    volume_ml: 5,
  })
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remoteAPIRef = useRef<RemotePumpAPI | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Initialize Remote API
  useEffect(() => {
    if (!enabled || !deviceId) {
      return
    }

    console.log('[useESP32Remote] Initializing for device:', deviceId)

    try {
      remoteAPIRef.current = createRemotePumpAPI(deviceId)

      // Subscribe to status updates
      unsubscribeRef.current = remoteAPIRef.current.subscribeToStatus((pumpStatus) => {
        console.log('[useESP32Remote] Status update:', pumpStatus)
        setStatus(pumpStatus)
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)
      })

      // Test connection
      testConnection()
    } catch (err) {
      console.error('[useESP32Remote] Initialization error:', err)
      setError('Không thể khởi tạo kết nối Firebase')
      setIsConnecting(false)
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      if (remoteAPIRef.current) {
        remoteAPIRef.current.cleanup()
        remoteAPIRef.current = null
      }
    }
  }, [deviceId, enabled])

  // Test connection
  const testConnection = useCallback(async () => {
    if (!remoteAPIRef.current) return false

    setIsConnecting(true)
    setError(null)

    try {
      const connected = await remoteAPIRef.current.testConnection()
      setIsConnected(connected)
      setIsConnecting(false)

      if (connected) {
        console.log('[useESP32Remote] Connection test successful')
      } else {
        setError('ESP32 không online')
      }

      return connected
    } catch (err) {
      console.error('[useESP32Remote] Connection test failed:', err)
      setError('Không thể kết nối đến ESP32')
      setIsConnected(false)
      setIsConnecting(false)
      return false
    }
  }, [])

  // Get current config
  const getCurrentConfig = useCallback(async () => {
    if (!remoteAPIRef.current) return null

    try {
      const currentConfig = await remoteAPIRef.current.getConfig()
      setConfig(currentConfig)
      return currentConfig
    } catch (err) {
      console.error('[useESP32Remote] Failed to get config:', err)
      return null
    }
  }, [])

  // Set config
  const setPumpConfig = useCallback(async (newConfig: PumpConfig) => {
    if (!remoteAPIRef.current) return false

    try {
      await remoteAPIRef.current.setConfig(newConfig)
      setConfig(newConfig)
      return true
    } catch (err) {
      console.error('[useESP32Remote] Failed to set config:', err)
      setError('Không thể cập nhật cấu hình')
      return false
    }
  }, [])

  // Commands
  const prepare = useCallback(async () => {
    if (!remoteAPIRef.current) return false
    try {
      await remoteAPIRef.current.prepare()
      return true
    } catch (err) {
      setError('Không thể chuẩn bị bơm')
      return false
    }
  }, [])

  const start = useCallback(async () => {
    if (!remoteAPIRef.current) return false
    try {
      await remoteAPIRef.current.start()
      return true
    } catch (err) {
      setError('Không thể bắt đầu bơm')
      return false
    }
  }, [])

  const pause = useCallback(async () => {
    if (!remoteAPIRef.current) return false
    try {
      await remoteAPIRef.current.pause()
      return true
    } catch (err) {
      setError('Không thể tạm dừng')
      return false
    }
  }, [])

  const resume = useCallback(async () => {
    if (!remoteAPIRef.current) return false
    try {
      await remoteAPIRef.current.resume()
      return true
    } catch (err) {
      setError('Không thể tiếp tục')
      return false
    }
  }, [])

  const stop = useCallback(async () => {
    if (!remoteAPIRef.current) return false
    try {
      await remoteAPIRef.current.stop()
      return true
    } catch (err) {
      setError('Không thể dừng bơm')
      return false
    }
  }, [])

  const rehome = useCallback(async () => {
    if (!remoteAPIRef.current) return false
    try {
      await remoteAPIRef.current.rehome()
      return true
    } catch (err) {
      setError('Không thể về home')
      return false
    }
  }, [])

  const resetAlarm = useCallback(async () => {
    if (!remoteAPIRef.current) return false
    try {
      await remoteAPIRef.current.resetAlarm()
      return true
    } catch (err) {
      setError('Không thể reset cảnh báo')
      return false
    }
  }, [])

  return {
    // State
    status,
    config,
    isConnected,
    isConnecting,
    error,

    // Methods
    testConnection,
    getCurrentConfig,
    setPumpConfig,
    prepare,
    start,
    pause,
    resume,
    stop,
    rehome,
    resetAlarm,
  }
}
