// Demo simulation specific types and constants

import type { PumpState, SyringeType } from './pump-types'

// Demo simulation state
export interface DemoSimulationState {
  // Core state machine
  state: PumpState
  previousState: PumpState | null
  
  // Configuration
  syringeType: SyringeType
  speedMlh: number
  volumeMl: number
  
  // Calculated values
  stepsPerMl: number
  totalSteps: number
  estimatedTimeSec: number
  
  // Progress tracking
  stepsCompleted: number
  elapsedTimeSec: number
  infusedVolumeMl: number
  progressPercent: number
  
  // Sensor simulation
  fsrRaw: number
  limitPressed: boolean
  contactFound: boolean
  
  // Status flags
  homed: boolean
  pumping: boolean
  paused: boolean
  errorType: DemoErrorType | null
  buzzerOn: boolean
  
  // Prepare stage tracking
  prepareStage: PrepareStage
  
  // Demo mode flags
  isAutoDemo: boolean
  autoDemoStep: number
}

export type PrepareStage = 
  | 'IDLE'
  | 'HOMING'
  | 'FINDING_CONTACT'
  | 'RECOGNIZED'
  | 'COMPLETE'

export type DemoErrorType = 'OCCLUSION' | 'DISCONNECTED' | 'LIMIT_ERROR'

// Demo history record
export interface DemoHistoryRecord {
  id: string
  syringeType: SyringeType
  speedMlh: number
  volumeMl: number
  totalTimeSec: number
  infusedVolumeMl: number
  stepsCompleted: number
  stepsTotal: number
  status: 'COMPLETED' | 'STOPPED' | 'ERROR'
  errorType?: DemoErrorType
  timestamp: number
  formattedTime: string
}

// Demo control panel flags
export interface DemoControlFlags {
  simulateHardware: boolean
  forceOnline: boolean
  manualFsrValue: number
  manualContactDetected: boolean
  manualLimitPressed: boolean
}

// Syringe calibration data
export const SYRINGE_CALIBRATION = {
  '10CC': {
    mmPerMl: 5.0,
    stepsPerMl: 1000,
    maxSpeedMlh: 60,
    minSpeedMlh: 0.1,
    maxVolume: 10,
  },
  '20CC': {
    mmPerMl: 3.33,
    stepsPerMl: 666,
    maxSpeedMlh: 120,
    minSpeedMlh: 0.1,
    maxVolume: 20,
  },
} as const

// FSR thresholds
export const FSR_THRESHOLDS = {
  idle: { min: 0, max: 100 },
  contact: { min: 450, max: 800 },
  occlusion: { min: 2000, max: 4095 },
  presenceThreshold: 450,
  occlusionThreshold: 2000,
}

// State transition timings (in ms)
export const STATE_TIMINGS = {
  boot: 1500,
  homing: 1200,
  findingContact: 1500,
  recognized: 800,
  buzzerPulse: 200,
  buzzerGap: 100,
}

// Auto demo script steps
export const AUTO_DEMO_SCRIPT = [
  { action: 'BOOT', delay: 1500 },
  { action: 'SELECT_SYRINGE', value: '10CC', delay: 800 },
  { action: 'GOTO_SETUP', delay: 500 },
  { action: 'SET_SPEED', value: 5.0, delay: 600 },
  { action: 'SET_VOLUME', value: 3.0, delay: 600 },
  { action: 'PREPARE', delay: 3500 },
  { action: 'START', delay: 1000 },
  { action: 'RUN', duration: 8000 },
  { action: 'PAUSE', delay: 2000 },
  { action: 'RESUME', delay: 1000 },
  { action: 'RUN', duration: 5000 },
  { action: 'COMPLETE', delay: 2000 },
] as const

// GPIO Technical specifications
export const TECHNICAL_SPECS = {
  gpio: {
    ENA: 25,
    DIR: 32,
    PUL: 33,
    FSR: 34,
    BUZZER: 26,
    LIMIT: 35,
    TFT_CS: 15,
    TFT_DC: 4,
    TFT_RST: 2,
    T_CS: 14,
    T_IRQ: 27,
  },
  motor: {
    stepsPerRev: 200,
    microstep: 8,
    totalStepsPerRev: 1600,
  },
  leadScrew: {
    pitchMm: 8,
  },
}

// Initial demo state
export const INITIAL_DEMO_STATE: DemoSimulationState = {
  state: 'BOOT',
  previousState: null,
  syringeType: '10CC',
  speedMlh: 5.0,
  volumeMl: 5.0,
  stepsPerMl: 1000,
  totalSteps: 5000,
  estimatedTimeSec: 3600,
  stepsCompleted: 0,
  elapsedTimeSec: 0,
  infusedVolumeMl: 0,
  progressPercent: 0,
  fsrRaw: 50,
  limitPressed: false,
  contactFound: false,
  homed: false,
  pumping: false,
  paused: false,
  errorType: null,
  buzzerOn: false,
  prepareStage: 'IDLE',
  isAutoDemo: false,
  autoDemoStep: 0,
}

export const INITIAL_CONTROL_FLAGS: DemoControlFlags = {
  simulateHardware: false,
  forceOnline: true,
  manualFsrValue: 50,
  manualContactDetected: false,
  manualLimitPressed: false,
}

// Helper to format timestamp
export function formatDemoTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day}/${month} ${hours}:${minutes}`
}

// Helper to calculate estimated time
export function calculateEstimatedTime(volumeMl: number, speedMlh: number): number {
  if (speedMlh <= 0) return 0
  return Math.ceil((volumeMl / speedMlh) * 3600)
}

// Helper to calculate steps
export function calculateTotalSteps(volumeMl: number, stepsPerMl: number): number {
  return Math.ceil(volumeMl * stepsPerMl)
}
