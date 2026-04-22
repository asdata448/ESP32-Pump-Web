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

  // Auto-save to Firebase on session completion
  useEffect(() => {
    if (!firebaseEnabled || !autoSave) return

    const { state, previousState } = sim.state

    // Only save when transitioning to terminal states
    const isSessionComplete = (
      // DONE after RESULT
      (state === 'DONE' && previousState === 'RESULT') ||
      // ERROR from any state
      (state === 'ERROR' && previousState !== 'ERROR') ||
      // STOPPED (handled in stop() callback, but we also catch here)
      (state === 'MAIN' && previousState === 'RESULT')
    )

    if (!isSessionComplete) return

    // Prevent duplicate saves
    const currentSessionKey = sessionKeyRef.current || `${state}-${previousState}-${Date.now()}`
    if (savedSessionRef.current === currentSessionKey) return

    // Determine status
    let status: 'COMPLETED' | 'STOPPED' | 'ERROR'
    if (state === 'DONE') {
      status = 'COMPLETED'
    } else if (state === 'ERROR') {
      status = 'ERROR'
    } else {
      status = 'STOPPED'
    }

    // Build record for Firebase - CHỈ gửi field có giá trị
    // Tất cả giá trị đều có default để tránh undefined
    const recordBase: Omit<PumpHistoryRecord, 'id' | 'timestamp' | 'createdAt' | 'deviceId' | 'notes' | 'errorType'> = {
      syringeType: sim.state.syringeType || '10CC',
      speedMlh: sim.state.speedMlh ?? 0,
      volumeMl: sim.state.volumeMl ?? 0,
      infusedVolumeMl: sim.state.infusedVolumeMl ?? 0,
      totalTimeSec: sim.state.elapsedTimeSec ?? 0,
      status,
      deviceIdString: deviceId,
    }

    // Chỉ thêm notes và errorType khi có lỗi
    const record = status === 'ERROR' && sim.state.errorType
      ? {
          ...recordBase,
          notes: `Lỗi: ${sim.state.errorType}`,
          errorType: sim.state.errorType,
        }
      : recordBase

    // Save to Firebase (fire and forget, don't block UI)
    firebase.saveRecord(record).then((docId) => {
      if (docId) {
        console.log('[Firebase] Session saved:', docId)
        savedSessionRef.current = currentSessionKey
      }
    }).catch((err) => {
      console.error('[Firebase] Failed to save session:', err)
    })
  }, [sim.state.state, sim.state.previousState, firebaseEnabled, autoSave, firebase, sim.state, deviceId])

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

    // Device info
    deviceId,
  }
}

// Type alias for convenience
export type UsePumpSimulationWithFirebaseReturn = ReturnType<typeof usePumpSimulationWithFirebase>
