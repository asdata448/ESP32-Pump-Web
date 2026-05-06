/**
 * Firebase Realtime Database Client
 * Handles real-time communication with ESP32 via Firebase Realtime Database
 */

import { getDatabase, ref, onValue, off, set, push, child, update, get, DatabaseReference, DataSnapshot, Database } from 'firebase/database'
import { getFirebaseApp } from './firebase'

// ========================================
// TYPES
// ========================================

export interface DeviceStatus {
  state: string
  syringeType: string
  syringeIndex: number
  speedMlh: number
  volumeMl: number
  remainingSec: number
  stepsCompleted: number
  stepsTotal: number
  homed: boolean
  contactFound: boolean
  fsrAlert: boolean
  pumpRunning: boolean
  paused: boolean
  fsrRaw: number
  limitPressed: boolean
  buzzerOn: boolean
  connectionStatus: 'online' | 'offline' | 'sleeping'
  updatedAt: number
  error?: string
}

export interface DeviceConfig {
  syringeIndex: number
  speedMlh: number
  volumeMl: number
}

export interface DeviceCommand {
  id?: string
  type: 'START' | 'STOP' | 'PAUSE' | 'RESUME' | 'CONFIG' | 'PREPARE' | 'REHOME' | 'RESET_ALARM'
  params?: Partial<DeviceConfig>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: number
  processedAt?: number
  result?: {
    success: boolean
    message: string
  }
}

export interface DeviceInfo {
  name: string
  type: string
  firmware: string
  lastSeen: number
  ipAddress: string
  macAddress: string
}

export type DeviceStatusCallback = (status: DeviceStatus) => void
export type CommandListCallback = (commands: DeviceCommand[]) => void
export type ConfigCallback = (config: DeviceConfig) => void

// ========================================
// FIREBASE REALTIME CLIENT CLASS
// ========================================

export class FirebaseRealtimeClient {
  private db: Database
  private deviceId: string
  private statusUnsubscribe: (() => void) | null = null
  private commandsUnsubscribe: (() => void) | null = null
  private configUnsubscribe: (() => void) | null = null

  constructor(deviceId: string) {
    const app = getFirebaseApp()
    this.db = getDatabase(app)
    this.deviceId = deviceId
  }

  // ========================================
  // STATUS OPERATIONS
  // ========================================

  /**
   * Subscribe to real-time status updates from ESP32
   * @param callback - Function to call when status changes
   * @returns Unsubscribe function
   */
  subscribeToStatus(callback: DeviceStatusCallback): () => void {
    console.log('[Firebase RT] Subscribing to status for device:', this.deviceId)

    const statusRef: DatabaseReference = ref(this.db, `devices/${this.deviceId}/status`)

    this.statusUnsubscribe = onValue(
      statusRef,
      (snapshot: DataSnapshot) => {
        const data = snapshot.val()
        if (data) {
          console.log('[Firebase RT] Status update received:', data)
          callback(data as DeviceStatus)
        } else {
          console.warn('[Firebase RT] No status data available')
        }
      },
      (error) => {
        console.error('[Firebase RT] Status subscription error:', error)
      }
    )

    // Return unsubscribe function
    return () => {
      if (this.statusUnsubscribe) {
        this.statusUnsubscribe()
        this.statusUnsubscribe = null
      }
      off(statusRef)
    }
  }

  /**
   * Get current status (one-time read)
   */
  async getStatus(): Promise<DeviceStatus | null> {
    try {
      const statusRef: DatabaseReference = ref(this.db, `devices/${this.deviceId}/status`)
      const snapshot = await get(statusRef) // Need to import get function

      if (snapshot.exists()) {
        return snapshot.val() as DeviceStatus
      }
      return null
    } catch (error) {
      console.error('[Firebase RT] Error getting status:', error)
      return null
    }
  }

  // ========================================
  // COMMAND OPERATIONS
  // ========================================

  /**
   * Send command to ESP32
   * @param command - Command object (without id, status, createdAt)
   * @returns Command ID if successful, null otherwise
   */
  async sendCommand(
    command: Omit<DeviceCommand, 'id' | 'status' | 'createdAt'>
  ): Promise<string | null> {
    try {
      console.log('[Firebase RT] Sending command:', command.type, command.params)

      const commandsRef: DatabaseReference = ref(this.db, `devices/${this.deviceId}/commands`)
      const newCommandRef: DatabaseReference = push(commandsRef)
      const commandId = newCommandRef.key

      if (!commandId) {
        console.error('[Firebase RT] Failed to generate command ID')
        return null
      }

      const commandData: DeviceCommand = {
        ...command,
        id: commandId,
        status: 'pending',
        createdAt: Date.now(),
      }

      await set(newCommandRef, commandData)

      console.log('[Firebase RT] Command sent with ID:', commandId)
      return commandId
    } catch (error) {
      console.error('[Firebase RT] Error sending command:', error)
      return null
    }
  }

  /**
   * Subscribe to command list updates
   * @param callback - Function to call when commands change
   * @returns Unsubscribe function
   */
  subscribeToCommands(callback: CommandListCallback): () => void {
    console.log('[Firebase RT] Subscribing to commands for device:', this.deviceId)

    const commandsRef: DatabaseReference = ref(this.db, `devices/${this.deviceId}/commands`)

    this.commandsUnsubscribe = onValue(
      commandsRef,
      (snapshot: DataSnapshot) => {
        const commands: DeviceCommand[] = []

        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot: DataSnapshot) => {
            const command = childSnapshot.val()
            commands.push({
              ...command,
              id: childSnapshot.key,
            })
          })
        }

        console.log('[Firebase RT] Commands update received:', commands.length)
        callback(commands)
      },
      (error) => {
        console.error('[Firebase RT] Commands subscription error:', error)
      }
    )

    return () => {
      if (this.commandsUnsubscribe) {
        this.commandsUnsubscribe()
        this.commandsUnsubscribe = null
      }
      off(commandsRef)
    }
  }

  // ========================================
  // CONFIG OPERATIONS
  // ========================================

  /**
   * Update device config
   * @param config - Partial config to update
   */
  async updateConfig(config: Partial<DeviceConfig>): Promise<boolean> {
    try {
      console.log('[Firebase RT] Updating config:', config)

      const configRef: DatabaseReference = ref(this.db, `devices/${this.deviceId}/config`)
      const updates = {
        ...config,
        updatedAt: Date.now(),
        updatedBy: 'web-client',
      }

      await update(configRef, updates)
      console.log('[Firebase RT] Config updated successfully')
      return true
    } catch (error) {
      console.error('[Firebase RT] Error updating config:', error)
      return false
    }
  }

  /**
   * Subscribe to config updates
   * @param callback - Function to call when config changes
   * @returns Unsubscribe function
   */
  subscribeToConfig(callback: ConfigCallback): () => void {
    console.log('[Firebase RT] Subscribing to config for device:', this.deviceId)

    const configRef: DatabaseReference = ref(this.db, `devices/${this.deviceId}/config`)

    this.configUnsubscribe = onValue(
      configRef,
      (snapshot: DataSnapshot) => {
        const data = snapshot.val()
        if (data) {
          console.log('[Firebase RT] Config update received:', data)
          callback(data as DeviceConfig)
        }
      },
      (error) => {
        console.error('[Firebase RT] Config subscription error:', error)
      }
    )

    return () => {
      if (this.configUnsubscribe) {
        this.configUnsubscribe()
        this.configUnsubscribe = null
      }
      off(configRef)
    }
  }

  /**
   * Get current config (one-time read)
   */
  async getConfig(): Promise<DeviceConfig | null> {
    try {
      const configRef: DatabaseReference = ref(this.db, `devices/${this.deviceId}/config`)
      const snapshot = await get(configRef)

      if (snapshot.exists()) {
        return snapshot.val() as DeviceConfig
      }
      return null
    } catch (error) {
      console.error('[Firebase RT] Error getting config:', error)
      return null
    }
  }

  // ========================================
  // DEVICE INFO OPERATIONS
  // ========================================

  /**
   * Register/update device info
   */
  async registerDevice(info: Partial<DeviceInfo>): Promise<boolean> {
    try {
      console.log('[Firebase RT] Registering device:', info)

      const infoRef: DatabaseReference = ref(this.db, `devices/${this.deviceId}/info`)
      const updates = {
        ...info,
        lastSeen: Date.now(),
      }

      await update(infoRef, updates)
      console.log('[Firebase RT] Device registered successfully')
      return true
    } catch (error) {
      console.error('[Firebase RT] Error registering device:', error)
      return false
    }
  }

  /**
   * Get device info
   */
  async getDeviceInfo(): Promise<DeviceInfo | null> {
    try {
      const infoRef: DatabaseReference = ref(this.db, `devices/${this.deviceId}/info`)
      const snapshot = await get(infoRef)

      if (snapshot.exists()) {
        return snapshot.val() as DeviceInfo
      }
      return null
    } catch (error) {
      console.error('[Firebase RT] Error getting device info:', error)
      return null
    }
  }

  // ========================================
  // CLEANUP
  // ========================================

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    console.log('[Firebase RT] Cleaning up subscriptions')

    if (this.statusUnsubscribe) {
      this.statusUnsubscribe()
      this.statusUnsubscribe = null
    }
    if (this.commandsUnsubscribe) {
      this.commandsUnsubscribe()
      this.commandsUnsubscribe = null
    }
    if (this.configUnsubscribe) {
      this.configUnsubscribe()
      this.configUnsubscribe = null
    }
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Generate device ID from MAC address (ESP32 style)
 */
export function generateDeviceId(): string {
  // For web client, we can use a generated ID
  // In production, this should match the ESP32's MAC-based ID
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `web_${timestamp}_${random}`.toUpperCase()
}

/**
 * Validate device ID format
 */
export function isValidDeviceId(deviceId: string): boolean {
  // Check if device ID matches expected format
  // ESP32 devices use MAC address format (12 hex characters)
  const macPattern = /^[0-9A-F]{12}$/
  return macPattern.test(deviceId)
}

/**
 * Format timestamp to readable string
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('vi-VN')
}

// ========================================
// FACTORY FUNCTION
// ========================================

/**
 * Create a Firebase Realtime client instance
 * @param deviceId - Device ID (ESP32 MAC address without colons)
 * @returns FirebaseRealtimeClient instance
 */
export function createFirebaseRTClient(deviceId: string): FirebaseRealtimeClient {
  return new FirebaseRealtimeClient(deviceId)
}

// Export types
export type { DeviceStatus, DeviceConfig, DeviceCommand, DeviceInfo }
