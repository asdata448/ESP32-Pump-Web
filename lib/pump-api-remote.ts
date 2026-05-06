/**
 * Remote Pump API via Firebase Realtime Database
 * Provides the same interface as pump-api.ts but uses Firebase for cloud control
 */

import type { PumpStatus, PumpConfig, HistoryEntry } from './pump-types'
import {
  createFirebaseRTClient,
  type DeviceStatus,
  type DeviceConfig,
  type DeviceCommand,
  type FirebaseRealtimeClient,
} from './firebase-rt'

const COMMAND_TIMEOUT = 30000 // 30 seconds

// ========================================
// TYPE CONVERSIONS
// ========================================

/**
 * Convert Firebase DeviceStatus to PumpStatus
 */
function convertToPumpStatus(deviceStatus: DeviceStatus): PumpStatus {
  return {
    state: deviceStatus.state,
    syringe: deviceStatus.syringeType,
    syringe_index: deviceStatus.syringeIndex,
    speed_mlh: deviceStatus.speedMlh,
    volume_ml: deviceStatus.volumeMl,
    remaining_sec: deviceStatus.remainingSec,
    steps_completed: deviceStatus.stepsCompleted,
    steps_total: deviceStatus.stepsTotal,
    homed: deviceStatus.homed,
    contact_found: deviceStatus.contactFound,
    fsr_alert: deviceStatus.fsrAlert,
    pump_running: deviceStatus.pumpRunning,
    paused: deviceStatus.paused,
    fsr_raw: deviceStatus.fsrRaw,
    limit_pressed: deviceStatus.limitPressed,
    buzzer_on: deviceStatus.buzzerOn,
    connection_status: deviceStatus.connectionStatus,
    updated_at: deviceStatus.updatedAt,
    error: deviceStatus.error,
    mode: 'remote',
  }
}

/**
 * Convert PumpConfig to DeviceConfig
 */
function convertToDeviceConfig(pumpConfig: PumpConfig): DeviceConfig {
  return {
    syringeIndex: pumpConfig.syringe_index,
    speedMlh: pumpConfig.speed_mlh,
    volumeMl: pumpConfig.volume_ml,
  }
}

/**
 * Convert DeviceConfig to PumpConfig
 */
function convertToPumpConfig(deviceConfig: DeviceConfig): PumpConfig {
  return {
    syringe_index: deviceConfig.syringeIndex,
    speed_mlh: deviceConfig.speedMlh,
    volume_ml: deviceConfig.volumeMl,
  }
}

// ========================================
// REMOTE PUMP API CLASS
// ========================================

export class RemotePumpAPI {
  private firebaseRT: FirebaseRealtimeClient
  private deviceId: string
  private statusListeners: Set<(status: PumpStatus) => void> = new Set()
  private currentStatus: DeviceStatus | null = null
  private currentConfig: DeviceConfig | null = null

  // Command result tracking
  private pendingCommands: Map<
    string,
    {
      resolve: (result: any) => void
      reject: (error: Error) => void
      timeout: NodeJS.Timeout
    }
  > = new Map()

  constructor(deviceId: string) {
    this.deviceId = deviceId
    this.firebaseRT = createFirebaseRTClient(deviceId)
    console.log('[RemoteAPI] Initialized for device:', deviceId)
    this.initializeListeners()
  }

  // ========================================
  // INITIALIZATION
  // ========================================

  private initializeListeners() {
    // Subscribe to status updates
    this.firebaseRT.subscribeToStatus((status: DeviceStatus) => {
      this.currentStatus = status
      const pumpStatus = convertToPumpStatus(status)
      this.statusListeners.forEach((listener) => listener(pumpStatus))
    })

    // Subscribe to command results
    this.firebaseRT.subscribeToCommands((commands: DeviceCommand[]) => {
      commands.forEach((command) => {
        const pending = this.pendingCommands.get(command.id!)
        if (pending && command.status !== 'pending') {
          clearTimeout(pending.timeout)
          this.pendingCommands.delete(command.id!)

          if (command.status === 'completed' && command.result?.success) {
            pending.resolve(command.result)
          } else {
            const errorMsg = command.result?.message || 'Command failed'
            pending.reject(new Error(errorMsg))
          }
        }
      })
    })
  }

  // ========================================
  // CONNECTION
  // ========================================

  /**
   * Test connection to ESP32 via Firebase
   */
  async testConnection(): Promise<boolean> {
    try {
      const status = await this.firebaseRT.getStatus()
      return status !== null && status.connectionStatus === 'online'
    } catch (error) {
      console.error('[RemoteAPI] Connection test failed:', error)
      return false
    }
  }

  // ========================================
  // STATUS OPERATIONS
  // ========================================

  /**
   * Get current pump status
   */
  async getStatus(): Promise<PumpStatus> {
    const status = await this.firebaseRT.getStatus()
    if (!status) {
      throw new Error('Failed to get status from Firebase')
    }
    return convertToPumpStatus(status)
  }

  /**
   * Subscribe to real-time status updates
   * @param callback - Function to call when status changes
   * @returns Unsubscribe function
   */
  subscribeToStatus(callback: (status: PumpStatus) => void): () => void {
    this.statusListeners.add(callback)

    // If we have current status, send it immediately
    if (this.currentStatus) {
      callback(convertToPumpStatus(this.currentStatus))
    }

    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(callback)
    }
  }

  // ========================================
  // CONFIG OPERATIONS
  // ========================================

  /**
   * Get current pump configuration
   */
  async getConfig(): Promise<PumpConfig> {
    const config = await this.firebaseRT.getConfig()
    if (!config) {
      // Return default config if not set
      return {
        syringe_index: 0,
        speed_mlh: 1.0,
        volume_ml: 5,
      }
    }
    return convertToPumpConfig(config)
  }

  /**
   * Update pump configuration
   */
  async setConfig(config: PumpConfig): Promise<void> {
    const deviceConfig = convertToDeviceConfig(config)
    const success = await this.firebaseRT.updateConfig(deviceConfig)
    if (!success) {
      throw new Error('Failed to update config')
    }
  }

  // ========================================
  // COMMAND OPERATIONS
  // ========================================

  /**
   * Execute a command and wait for result
   */
  private async executeCommand(
    type: DeviceCommand['type'],
    params?: Partial<DeviceConfig>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const commandId = Date.now().toString()

      // Send command via Firebase
      this.firebaseRT
        .sendCommand({ type, params })
        .then((id) => {
          if (!id) {
            reject(new Error('Failed to send command'))
            return
          }

          // Set up timeout for command result
          const timeout = setTimeout(() => {
            this.pendingCommands.delete(commandId)
            reject(new Error('Command timeout'))
          }, COMMAND_TIMEOUT)

          // Store pending command
          this.pendingCommands.set(commandId, { resolve, reject, timeout })
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  /**
   * Prepare the pump (home + find syringe)
   */
  async prepare(): Promise<void> {
    await this.executeCommand('PREPARE')
  }

  /**
   * Start pumping
   */
  async start(): Promise<void> {
    await this.executeCommand('START')
  }

  /**
   * Pause pumping
   */
  async pause(): Promise<void> {
    await this.executeCommand('PAUSE')
  }

  /**
   * Resume pumping
   */
  async resume(): Promise<void> {
    await this.executeCommand('RESUME')
  }

  /**
   * Stop pumping
   */
  async stop(): Promise<void> {
    await this.executeCommand('STOP')
  }

  /**
   * Rehome the pump
   */
  async rehome(): Promise<void> {
    await this.executeCommand('REHOME')
  }

  /**
   * Reset FSR alarm
   */
  async resetAlarm(): Promise<void> {
    await this.executeCommand('RESET_ALARM')
  }

  // ========================================
  // DEVICE INFO
  // ========================================

  /**
   * Get device information
   */
  async getDeviceInfo() {
    return await this.firebaseRT.getDeviceInfo()
  }

  /**
   * Register device
   */
  async registerDevice(info: any): Promise<boolean> {
    return await this.firebaseRT.registerDevice(info)
  }

  // ========================================
  // CLEANUP
  // ========================================

  /**
   * Clean up resources
   */
  cleanup() {
    console.log('[RemoteAPI] Cleaning up...')

    // Clear all pending commands
    this.pendingCommands.forEach(({ timeout }) => clearTimeout(timeout))
    this.pendingCommands.clear()

    // Clear status listeners
    this.statusListeners.clear()

    // Cleanup Firebase client
    this.firebaseRT.cleanup()
  }
}

// ========================================
// FACTORY FUNCTION
// ========================================

/**
 * Create a Remote Pump API instance
 * @param deviceId - ESP32 device ID (MAC address without colons)
 * @returns RemotePumpAPI instance
 */
export function createRemotePumpAPI(deviceId: string): RemotePumpAPI {
  return new RemotePumpAPI(deviceId)
}

// ========================================
// EXPORTS
// ========================================

export type { RemotePumpAPI }
