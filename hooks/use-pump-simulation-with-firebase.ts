'use client'

import { useEffect, useRef } from 'react'
import { usePumpSimulation } from './use-pump-simulation'
import { useFirebaseHistory } from './use-firebase-history'
import type { PumpHistoryRecord } from '@/lib/firebase'

const DEVICE_ID_KEY = 'pump_device_id'

// Generate or get device ID
function getDeviceId(): string {
  if (typeof window === 'undefined') return 'demo-device'

  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}

interface UsePumpSimulationWithFirebaseOptions {
  /**
   * Enable Firebase sync
   * @default true
   */
  firebaseEnabled?: boolean

  /**
   * Auto-save sessions to Firebase when DONE/ERROR/STOPPED
   * @default true
   */
  autoSave?: boolean

  /**
   * Device ID for Firebase records
   * @default auto-generated from localStorage
   */
  deviceId?: string
}

export function usePumpSimulationWithFirebase({
  firebaseEnabled = true,
  autoSave = true,
  deviceId: providedDeviceId,
}: UsePumpSimulationWithFirebaseOptions = {}) {
  const deviceId = providedDeviceId || getDeviceId()

  // Base simulation hook
  const sim = usePumpSimulation()

  // Firebase history hook
  const firebase = useFirebaseHistory({
    deviceId,
    enabled: firebaseEnabled,
    limit: 20,
    dataSource: 'demo', // Data demo từ simulation
  })

  // Track sessions that have been saved to avoid duplicates
  const savedSessionRef = useRef<string | null>(null)

  // Generate a session key when pumping starts
  const sessionKeyRef = useRef<string | null>(null)

  // Generate session key when starting to pump
  useEffect(() => {
    if (sim.state.state === 'RESULT' && sim.state.pumping && !sim.state.paused) {
      if (!sessionKeyRef.current) {
        sessionKeyRef.current = `${sim.state.syringeType}-${sim.state.speedMlh}-${sim.state.volumeMl}-${sim.state.totalSteps}-${Date.now()}`
      }
    } else if (sim.state.state === 'MAIN' || sim.state.state === 'SETUP' || sim.state.state === 'READY') {
      // Reset session key when going back to setup
      sessionKeyRef.current = null
    }
  }, [sim.state.state, sim.state.pumping, sim.state.paused, sim.state.syringeType, sim.state.speedMlh, sim.state.volumeMl, sim.state.totalSteps])

  // ===== AUTO-SAVE DISABLED =====
  // Auto-save has been disabled. User must manually save using the UI button.
  // useEffect(() => {
  //   if (!firebaseEnabled || !autoSave) return
  //   ... (removed auto-save logic)
  // }, [sim.state.state, sim.state.previousState, ...])

  return {
    ...sim,

    // Firebase properties
    firebaseEnabled,
    firebaseHistory: firebase.history,
    firebaseLoading: firebase.loading,
    firebaseError: firebase.error,

    // Firebase actions
    refreshFirebaseHistory: () => {
      // Real-time listener already handles this
    },
    clearFirebaseHistory: firebase.clearLocalHistory,
    requestNotificationPermission: firebase.requestPermission,
    notificationPermission: firebase.notificationPermission,
    testConnection: firebase.testConnection,
    deleteAllHistory: firebase.deleteAllHistory,
    deleteAllHistoryCollection: firebase.deleteAllHistoryCollection,

    // Device info
    deviceId,
  }
}

// Type alias for convenience
export type UsePumpSimulationWithFirebaseReturn = ReturnType<typeof usePumpSimulationWithFirebase>
