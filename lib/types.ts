export interface PinState {
  pin: number | string
  value: number
  mode: 'digital' | 'pwm' | 'input'
  lastUpdated?: string
}

export interface SystemInfo {
  heap: number
  uptime: number
  mac: string
  ssid: string
  rssi: number
  clients: number
  version: string
  flash: number
  temp?: number
}

export interface ESP32Config {
  ip: string
  port: number
  authToken?: string
}

export interface ESP32State {
  ip: string
  port: number
  isConnected: boolean
  isConnecting: boolean
  latency: number | null
  pinStates: Record<string, PinState>
  analogValues: Record<string, number[]>
  serialLog: string[]
  systemInfo: SystemInfo | null
  lastPing: string | null
  isDemoMode: boolean
}

export interface Macro {
  id: string
  name: string
  action: string
  pin?: number
  interval?: number
  angle?: number
  method: 'GET' | 'POST'
  endpoint: string
  body?: Record<string, unknown>
  isEmergency?: boolean
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  timestamp: number
}

export const PIN_CONFIG = {
  digital: [
    { id: 'D0', pin: 0, capabilities: ['DIGITAL', 'RX'] },
    { id: 'D1', pin: 1, capabilities: ['DIGITAL', 'TX'] },
    { id: 'D2', pin: 2, capabilities: ['DIGITAL', 'PWM'] },
    { id: 'D3', pin: 3, capabilities: ['DIGITAL', 'PWM'] },
    { id: 'D4', pin: 4, capabilities: ['DIGITAL'] },
    { id: 'D5', pin: 5, capabilities: ['DIGITAL', 'PWM'] },
    { id: 'D6', pin: 6, capabilities: ['DIGITAL', 'PWM'] },
    { id: 'D7', pin: 7, capabilities: ['DIGITAL'] },
    { id: 'D8', pin: 8, capabilities: ['DIGITAL'] },
    { id: 'D9', pin: 9, capabilities: ['DIGITAL', 'PWM'] },
    { id: 'D10', pin: 10, capabilities: ['DIGITAL', 'PWM'] },
    { id: 'D11', pin: 11, capabilities: ['DIGITAL', 'PWM'] },
    { id: 'D12', pin: 12, capabilities: ['DIGITAL'] },
    { id: 'D13', pin: 13, capabilities: ['DIGITAL', 'PWM'] },
  ],
  analog: [
    { id: 'A0', pin: 34, capabilities: ['ANALOG'] },
    { id: 'A1', pin: 35, capabilities: ['ANALOG'] },
    { id: 'A2', pin: 36, capabilities: ['ANALOG'] },
    { id: 'A3', pin: 39, capabilities: ['ANALOG'] },
    { id: 'A4', pin: 32, capabilities: ['ANALOG', 'SDA'] },
    { id: 'A5', pin: 33, capabilities: ['ANALOG', 'SCL'] },
  ],
}

export const DEFAULT_MACROS: Macro[] = [
  { id: '1', name: 'ALL PINS OFF', action: 'all_off', method: 'POST', endpoint: '/api/macro', body: { action: 'all_off' } },
  { id: '2', name: 'ALL PINS ON', action: 'all_on', method: 'POST', endpoint: '/api/macro', body: { action: 'all_on' } },
  { id: '3', name: 'BLINK D13', action: 'blink', pin: 13, interval: 500, method: 'POST', endpoint: '/api/macro', body: { action: 'blink', pin: 13, interval: 500 } },
  { id: '4', name: 'FADE LED', action: 'fade', pin: 9, method: 'POST', endpoint: '/api/macro', body: { action: 'fade', pin: 9 } },
  { id: '5', name: 'SERVO 90°', action: 'servo', pin: 10, angle: 90, method: 'POST', endpoint: '/api/macro', body: { action: 'servo', pin: 10, angle: 90 } },
  { id: '6', name: 'SERVO 0°', action: 'servo', pin: 10, angle: 0, method: 'POST', endpoint: '/api/macro', body: { action: 'servo', pin: 10, angle: 0 } },
  { id: '7', name: 'READ ALL ANALOG', action: 'read_analog', method: 'GET', endpoint: '/api/analog/all' },
  { id: '8', name: 'EMERGENCY STOP', action: 'all_off', method: 'POST', endpoint: '/api/macro', body: { action: 'all_off' }, isEmergency: true },
]
