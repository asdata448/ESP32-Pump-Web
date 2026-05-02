import type { PumpStatus, PumpConfig, HistoryEntry, DEFAULT_STATUS, DEFAULT_CONFIG } from './pump-types'

const TIMEOUT = 3000 // 3 second timeout

// Get base URL from localStorage or use default
export function getBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://192.168.4.1'
  return localStorage.getItem('esp32_base_url') || 'http://192.168.4.1'
}

export function setBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('esp32_base_url', url)
  }
}

// Fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

// API Client
export const pumpApi = {
  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(`${getBaseUrl()}/api/status`)
      return response.ok
    } catch {
      return false
    }
  },

  // GET /api/status
  async getStatus(): Promise<PumpStatus> {
    const response = await fetchWithTimeout(`${getBaseUrl()}/api/status`)
    if (!response.ok) throw new Error('Failed to fetch status')
    return response.json()
  },

  // GET /api/config
  async getConfig(): Promise<PumpConfig> {
    const response = await fetchWithTimeout(`${getBaseUrl()}/api/config`)
    if (!response.ok) throw new Error('Failed to fetch config')
    return response.json()
  },

  // GET /api/history
  async getHistory(): Promise<HistoryEntry[]> {
    const response = await fetchWithTimeout(`${getBaseUrl()}/api/history`)
    if (!response.ok) throw new Error('Failed to fetch history')
    return response.json()
  },

  // POST /api/config
  async setConfig(config: PumpConfig): Promise<void> {
    const response = await fetchWithTimeout(`${getBaseUrl()}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    if (!response.ok) throw new Error('Failed to save config')
  },

  // POST /api/prepare
  async prepare(): Promise<void> {
    const response = await fetchWithTimeout(`${getBaseUrl()}/api/prepare`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to prepare')
  },

  // POST /api/start
  async start(): Promise<void> {
    const response = await fetchWithTimeout(`${getBaseUrl()}/api/start`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to start')
  },

  // POST /api/pause
  async pause(): Promise<void> {
    const response = await fetchWithTimeout(`${getBaseUrl()}/api/pause`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to pause')
  },

  // POST /api/resume
  async resume(): Promise<void> {
    const response = await fetchWithTimeout(`${getBaseUrl()}/api/resume`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to resume')
  },

  // POST /api/stop
  async stop(): Promise<void> {
    const response = await fetchWithTimeout(`${getBaseUrl()}/api/stop`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to stop')
  },

  // POST /api/rehome
  async rehome(): Promise<void> {
    const response = await fetchWithTimeout(`${getBaseUrl()}/api/rehome`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to rehome')
  },

  // POST /api/reset_alarm
  async resetAlarm(): Promise<void> {
    const response = await fetchWithTimeout(`${getBaseUrl()}/api/reset_alarm`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to reset alarm')
  },
}

// Mock data generators for demo mode
export function generateMockFSRData(count: number): { time: number; value: number }[] {
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => ({
    time: now - (count - i) * 500,
    value: Math.floor(200 + Math.random() * 300 + Math.sin(i * 0.1) * 100),
  }))
}

export function generateMockProgressData(
  completed: number,
  total: number,
  volume: number
): { time: number; progress: number; volume: number }[] {
  const count = 20
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => {
    const progress = Math.min(100, (completed / total) * 100 * ((i + 1) / count))
    return {
      time: now - (count - i) * 3000,
      progress: Math.round(progress),
      volume: Number((volume * (progress / 100)).toFixed(2)),
    }
  })
}

export function generateMockHistory(): HistoryEntry[] {
  return [
    { speed_mlh: 1.0, volume_ml: 5, total_sec: 18000, syringe: '10CC' },
    { speed_mlh: 2.5, volume_ml: 3, total_sec: 4320, syringe: '20CC' },
    { speed_mlh: 0.5, volume_ml: 10, total_sec: 72000, syringe: '10CC' },
    { speed_mlh: 1.5, volume_ml: 8, total_sec: 19200, syringe: '20CC' },
    { speed_mlh: 3.0, volume_ml: 2, total_sec: 2400, syringe: '10CC' },
  ]
}
