'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ESP32State, PinState, SystemInfo, Macro, ToastMessage } from '@/lib/types'

const TIMEOUT_MS = 3000
const DEMO_MODE_ENABLED = true

// Generate mock data for demo mode
function generateMockSystemInfo(): SystemInfo {
  return {
    heap: Math.floor(200000 + Math.random() * 50000),
    uptime: Math.floor(Date.now() / 1000) % 86400,
    mac: 'AA:BB:CC:DD:EE:FF',
    ssid: 'DEMO_NETWORK',
    rssi: Math.floor(-70 + Math.random() * 30),
    clients: 1,
    version: '1.0.0-demo',
    flash: 4194304,
    temp: Math.floor(35 + Math.random() * 10),
  }
}

function generateMockPinState(pinId: string): PinState {
  return {
    pin: pinId,
    value: Math.random() > 0.5 ? 1 : 0,
    mode: 'digital',
    lastUpdated: new Date().toISOString(),
  }
}

function generateMockAnalogValue(): number {
  return Math.floor(Math.random() * 1024)
}

export function useESP32() {
  const [state, setState] = useState<ESP32State>({
    ip: '192.168.1.100',
    port: 80,
    isConnected: false,
    isConnecting: false,
    latency: null,
    pinStates: {},
    analogValues: { A0: [], A1: [], A2: [], A3: [], A4: [], A5: [] },
    serialLog: [],
    systemInfo: null,
    lastPing: null,
    isDemoMode: false,
  })

  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('esp32-config')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        setState(prev => ({ ...prev, ip: config.ip || prev.ip, port: config.port || prev.port }))
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const toast: ToastMessage = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: Date.now(),
    }
    setToasts(prev => [...prev.slice(-2), toast])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const getBaseUrl = useCallback(() => {
    return `http://${state.ip}:${state.port}`
  }, [state.ip, state.port])

  const fetchWithTimeout = useCallback(async (url: string, options: RequestInit = {}) => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        ...options,
        signal: abortControllerRef.current.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }, [])

  const setConfig = useCallback((ip: string, port: number) => {
    setState(prev => ({ ...prev, ip, port }))
    localStorage.setItem('esp32-config', JSON.stringify({ ip, port }))
  }, [])

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, isDemoMode: false }))
    const startTime = Date.now()

    try {
      const response = await fetchWithTimeout(`${getBaseUrl()}/api/ping`)
      const data = await response.json()
      const latency = Date.now() - startTime

      if (data.status === 'ok') {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          latency,
          lastPing: new Date().toISOString(),
          isDemoMode: false,
        }))
        addToast('success', `Connected to ESP32 at ${state.ip}`)
        return true
      }
      throw new Error('Invalid response')
    } catch {
      if (DEMO_MODE_ENABLED) {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          latency: 24,
          lastPing: new Date().toISOString(),
          isDemoMode: true,
          systemInfo: generateMockSystemInfo(),
        }))
        addToast('warning', 'ESP32 not found. Running in DEMO MODE')
        return true
      }
      setState(prev => ({ ...prev, isConnected: false, isConnecting: false }))
      addToast('error', 'Failed to connect to ESP32')
      return false
    }
  }, [fetchWithTimeout, getBaseUrl, state.ip, addToast])

  const disconnect = useCallback(() => {
    abortControllerRef.current?.abort()
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      latency: null,
      isDemoMode: false,
    }))
    addToast('info', 'Disconnected from ESP32')
  }, [addToast])

  const ping = useCallback(async () => {
    if (state.isDemoMode) {
      setState(prev => ({
        ...prev,
        latency: Math.floor(20 + Math.random() * 10),
        lastPing: new Date().toISOString(),
      }))
      return true
    }

    const startTime = Date.now()
    try {
      const response = await fetchWithTimeout(`${getBaseUrl()}/api/ping`)
      const data = await response.json()
      const latency = Date.now() - startTime

      if (data.status === 'ok') {
        setState(prev => ({ ...prev, latency, lastPing: new Date().toISOString() }))
        return true
      }
      return false
    } catch {
      setState(prev => ({ ...prev, isConnected: false, latency: null }))
      return false
    }
  }, [fetchWithTimeout, getBaseUrl, state.isDemoMode])

  const fetchSystemInfo = useCallback(async () => {
    if (state.isDemoMode) {
      setState(prev => ({ ...prev, systemInfo: generateMockSystemInfo() }))
      return
    }

    try {
      const response = await fetchWithTimeout(`${getBaseUrl()}/api/system`)
      const data: SystemInfo = await response.json()
      setState(prev => ({ ...prev, systemInfo: data }))
    } catch {
      // Ignore errors
    }
  }, [fetchWithTimeout, getBaseUrl, state.isDemoMode])

  const readPin = useCallback(async (pin: number | string) => {
    if (state.isDemoMode) {
      const pinState = generateMockPinState(String(pin))
      setState(prev => ({
        ...prev,
        pinStates: { ...prev.pinStates, [pin]: pinState },
      }))
      return pinState
    }

    try {
      const response = await fetchWithTimeout(`${getBaseUrl()}/api/pin?pin=${pin}`)
      const data: PinState = await response.json()
      data.lastUpdated = new Date().toISOString()
      setState(prev => ({
        ...prev,
        pinStates: { ...prev.pinStates, [pin]: data },
      }))
      return data
    } catch {
      return null
    }
  }, [fetchWithTimeout, getBaseUrl, state.isDemoMode])

  const writePin = useCallback(async (pin: number, mode: 'digital' | 'pwm', value: number) => {
    if (state.isDemoMode) {
      const pinState: PinState = { pin, mode, value, lastUpdated: new Date().toISOString() }
      setState(prev => ({
        ...prev,
        pinStates: { ...prev.pinStates, [pin]: pinState },
      }))
      addToast('success', `Pin ${pin} set to ${value}`)
      return true
    }

    try {
      const response = await fetchWithTimeout(`${getBaseUrl()}/api/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, mode, value }),
      })
      const data = await response.json()
      if (data.status === 'ok') {
        setState(prev => ({
          ...prev,
          pinStates: {
            ...prev.pinStates,
            [pin]: { pin, mode, value, lastUpdated: new Date().toISOString() },
          },
        }))
        addToast('success', `Pin ${pin} set to ${value}`)
        return true
      }
      return false
    } catch {
      addToast('error', `Failed to set pin ${pin}`)
      return false
    }
  }, [fetchWithTimeout, getBaseUrl, state.isDemoMode, addToast])

  const readAnalog = useCallback(async (pin: string) => {
    if (state.isDemoMode) {
      const value = generateMockAnalogValue()
      setState(prev => ({
        ...prev,
        analogValues: {
          ...prev.analogValues,
          [pin]: [...(prev.analogValues[pin] || []).slice(-100), value],
        },
      }))
      return value
    }

    try {
      const response = await fetchWithTimeout(`${getBaseUrl()}/api/analog?pin=${pin}`)
      const data = await response.json()
      setState(prev => ({
        ...prev,
        analogValues: {
          ...prev.analogValues,
          [pin]: [...(prev.analogValues[pin] || []).slice(-100), data.value],
        },
      }))
      return data.value
    } catch {
      return null
    }
  }, [fetchWithTimeout, getBaseUrl, state.isDemoMode])

  const fetchSerial = useCallback(async () => {
    if (state.isDemoMode) {
      const mockLines = [
        `[${new Date().toISOString()}] System heartbeat`,
        `[INFO] Temperature: ${(35 + Math.random() * 10).toFixed(1)}°C`,
        `[DEBUG] Free heap: ${Math.floor(200000 + Math.random() * 50000)} bytes`,
      ]
      if (Math.random() > 0.7) {
        setState(prev => ({
          ...prev,
          serialLog: [...prev.serialLog.slice(-47), mockLines[Math.floor(Math.random() * mockLines.length)]],
        }))
      }
      return
    }

    try {
      const response = await fetchWithTimeout(`${getBaseUrl()}/api/serial`)
      const data = await response.json()
      if (data.lines && data.lines.length > 0) {
        setState(prev => ({
          ...prev,
          serialLog: [...prev.serialLog.slice(-47), ...data.lines].slice(-50),
        }))
      }
    } catch {
      // Ignore errors
    }
  }, [fetchWithTimeout, getBaseUrl, state.isDemoMode])

  const sendSerialCommand = useCallback(async (command: string) => {
    if (state.isDemoMode) {
      setState(prev => ({
        ...prev,
        serialLog: [...prev.serialLog.slice(-48), `> ${command}`, `[OK] Command received: ${command}`],
      }))
      addToast('success', 'Command sent')
      return true
    }

    try {
      const response = await fetchWithTimeout(`${getBaseUrl()}/api/serial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })
      const data = await response.json()
      if (data.status === 'received') {
        setState(prev => ({
          ...prev,
          serialLog: [...prev.serialLog.slice(-49), `> ${command}`],
        }))
        addToast('success', 'Command sent')
        return true
      }
      return false
    } catch {
      addToast('error', 'Failed to send command')
      return false
    }
  }, [fetchWithTimeout, getBaseUrl, state.isDemoMode, addToast])

  const executeMacro = useCallback(async (macro: Macro) => {
    if (state.isDemoMode) {
      addToast('success', `Macro "${macro.name}" executed`)
      return true
    }

    try {
      const url = `${getBaseUrl()}${macro.endpoint}`
      const options: RequestInit = { method: macro.method }
      if (macro.method === 'POST' && macro.body) {
        options.headers = { 'Content-Type': 'application/json' }
        options.body = JSON.stringify(macro.body)
      }
      const response = await fetchWithTimeout(url, options)
      const data = await response.json()
      if (data.status === 'done' || data.status === 'ok') {
        addToast('success', `Macro "${macro.name}" executed`)
        return true
      }
      return false
    } catch {
      addToast('error', `Failed to execute macro "${macro.name}"`)
      return false
    }
  }, [fetchWithTimeout, getBaseUrl, state.isDemoMode, addToast])

  const clearSerialLog = useCallback(() => {
    setState(prev => ({ ...prev, serialLog: [] }))
  }, [])

  return {
    state,
    toasts,
    setConfig,
    connect,
    disconnect,
    ping,
    fetchSystemInfo,
    readPin,
    writePin,
    readAnalog,
    fetchSerial,
    sendSerialCommand,
    executeMacro,
    clearSerialLog,
    addToast,
    removeToast,
  }
}
