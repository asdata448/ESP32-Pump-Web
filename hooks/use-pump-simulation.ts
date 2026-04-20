'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  type DemoSimulationState,
  type DemoHistoryRecord,
  type DemoControlFlags,
  type DemoErrorType,
  type PrepareStage,
  INITIAL_DEMO_STATE,
  INITIAL_CONTROL_FLAGS,
  SYRINGE_CALIBRATION,
  FSR_THRESHOLDS,
  STATE_TIMINGS,
  calculateEstimatedTime,
  calculateTotalSteps,
  formatDemoTimestamp,
} from '@/lib/demo-types'
import type { SyringeType } from '@/lib/pump-types'

const HISTORY_KEY = 'pump_demo_history'
const SIMULATION_INTERVAL = 100 // ms

export function usePumpSimulation() {
  const [state, setState] = useState<DemoSimulationState>(INITIAL_DEMO_STATE)
  const [controlFlags, setControlFlags] = useState<DemoControlFlags>(INITIAL_CONTROL_FLAGS)
  const [history, setHistory] = useState<DemoHistoryRecord[]>([])
  const [presentationMode, setPresentationMode] = useState(false)
  
  const simulationRef = useRef<NodeJS.Timeout | null>(null)
  const prepareTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const autoDemoRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setHistory(parsed.slice(0, 5))
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Save history to localStorage
  const saveHistory = useCallback((newHistory: DemoHistoryRecord[]) => {
    const trimmed = newHistory.slice(0, 5)
    setHistory(trimmed)
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current)
      simulationRef.current = null
    }
    if (prepareTimeoutRef.current) {
      clearTimeout(prepareTimeoutRef.current)
      prepareTimeoutRef.current = null
    }
    if (autoDemoRef.current) {
      clearTimeout(autoDemoRef.current)
      autoDemoRef.current = null
    }
  }, [])

  // Update FSR based on state
  const getSimulatedFSR = useCallback((currentState: DemoSimulationState): number => {
    if (controlFlags.simulateHardware) {
      return controlFlags.manualFsrValue
    }
    
    // Natural FSR simulation based on state
    if (currentState.errorType === 'OCCLUSION') {
      return FSR_THRESHOLDS.occlusion.min + Math.random() * 500
    }
    if (currentState.pumping && currentState.contactFound) {
      // Medium FSR during normal pumping with slight variation
      return FSR_THRESHOLDS.contact.min + Math.random() * 200
    }
    if (currentState.contactFound) {
      return FSR_THRESHOLDS.contact.min + Math.random() * 100
    }
    // Idle - low FSR
    return FSR_THRESHOLDS.idle.min + Math.random() * 50
  }, [controlFlags])

  // Recalculate derived values
  const recalculateValues = useCallback((
    syringe: SyringeType,
    speed: number,
    volume: number
  ) => {
    const cal = SYRINGE_CALIBRATION[syringe]
    const stepsPerMl = cal.stepsPerMl
    const totalSteps = calculateTotalSteps(volume, stepsPerMl)
    const estimatedTimeSec = calculateEstimatedTime(volume, speed)
    return { stepsPerMl, totalSteps, estimatedTimeSec }
  }, [])

  // Boot sequence
  const boot = useCallback(() => {
    clearAllTimers()
    setState(prev => ({
      ...INITIAL_DEMO_STATE,
      state: 'BOOT',
      previousState: prev.state,
    }))
    
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        state: 'SYRINGE',
        previousState: 'BOOT',
      }))
    }, STATE_TIMINGS.boot)
  }, [clearAllTimers])

  // Select syringe
  const selectSyringe = useCallback((type: SyringeType) => {
    const cal = SYRINGE_CALIBRATION[type]
    const values = recalculateValues(type, cal.minSpeedMlh, 1)
    
    setState(prev => ({
      ...prev,
      state: 'MAIN',
      previousState: 'SYRINGE',
      syringeType: type,
      speedMlh: 5.0,
      volumeMl: type === '10CC' ? 5.0 : 10.0,
      ...values,
    }))
  }, [recalculateValues])

  // Go to setup
  const gotoSetup = useCallback(() => {
    setState(prev => ({
      ...prev,
      state: 'SETUP',
      previousState: prev.state,
    }))
  }, [])

  // Update config
  const updateConfig = useCallback((speed: number, volume: number) => {
    setState(prev => {
      const values = recalculateValues(prev.syringeType, speed, volume)
      return {
        ...prev,
        speedMlh: speed,
        volumeMl: volume,
        ...values,
      }
    })
  }, [recalculateValues])

  // Prepare sequence
  const prepare = useCallback(() => {
    clearAllTimers()
    
    setState(prev => ({
      ...prev,
      state: 'PREPARE',
      previousState: prev.state,
      prepareStage: 'HOMING',
      homed: false,
      contactFound: false,
      stepsCompleted: 0,
      elapsedTimeSec: 0,
      infusedVolumeMl: 0,
      progressPercent: 0,
      errorType: null,
    }))

    // Stage 1: Homing
    prepareTimeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        prepareStage: 'FINDING_CONTACT',
        homed: true,
      }))
      
      // Stage 2: Finding contact
      prepareTimeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          prepareStage: 'RECOGNIZED',
          contactFound: true,
          fsrRaw: FSR_THRESHOLDS.contact.min + 100,
        }))
        
        // Stage 3: Complete
        prepareTimeoutRef.current = setTimeout(() => {
          setState(prev => ({
            ...prev,
            state: 'READY',
            previousState: 'PREPARE',
            prepareStage: 'COMPLETE',
          }))
        }, STATE_TIMINGS.recognized)
        
      }, STATE_TIMINGS.findingContact)
      
    }, STATE_TIMINGS.homing)
  }, [clearAllTimers])

  // Start pumping
  const start = useCallback(() => {
    if (simulationRef.current) return
    
    startTimeRef.current = Date.now()
    
    setState(prev => ({
      ...prev,
      state: 'RESULT',
      previousState: prev.state,
      pumping: true,
      paused: false,
      buzzerOn: false,
    }))

    // Start simulation loop
    simulationRef.current = setInterval(() => {
      setState(prev => {
        if (!prev.pumping || prev.paused || prev.errorType) {
          return prev
        }
        
        // Calculate step increment based on speed
        // speed is ml/h, we need steps per 100ms
        const stepsPerSecond = (prev.speedMlh / 3600) * prev.stepsPerMl
        const stepsPerInterval = stepsPerSecond * (SIMULATION_INTERVAL / 1000)
        
        const newStepsCompleted = Math.min(
          prev.stepsCompleted + stepsPerInterval,
          prev.totalSteps
        )
        
        const progressPercent = (newStepsCompleted / prev.totalSteps) * 100
        const infusedVolumeMl = newStepsCompleted / prev.stepsPerMl
        const elapsedTimeSec = prev.elapsedTimeSec + (SIMULATION_INTERVAL / 1000)
        
        // Check if complete
        if (newStepsCompleted >= prev.totalSteps) {
          clearInterval(simulationRef.current!)
          simulationRef.current = null
          
          return {
            ...prev,
            state: 'DONE',
            previousState: 'RESULT',
            stepsCompleted: prev.totalSteps,
            progressPercent: 100,
            infusedVolumeMl: prev.volumeMl,
            elapsedTimeSec,
            pumping: false,
            buzzerOn: true,
          }
        }
        
        return {
          ...prev,
          stepsCompleted: newStepsCompleted,
          progressPercent,
          infusedVolumeMl,
          elapsedTimeSec,
          fsrRaw: FSR_THRESHOLDS.contact.min + Math.random() * 150,
        }
      })
    }, SIMULATION_INTERVAL)
  }, [])

  // Pause
  const pause = useCallback(() => {
    setState(prev => ({
      ...prev,
      paused: true,
      pumping: false,
    }))
  }, [])

  // Resume
  const resume = useCallback(() => {
    if (state.errorType) return
    
    setState(prev => ({
      ...prev,
      paused: false,
      pumping: true,
    }))
  }, [state.errorType])

  // Stop
  const stop = useCallback(() => {
    clearAllTimers()
    
    setState(prev => {
      // Add to history
      const record: DemoHistoryRecord = {
        id: Date.now().toString(),
        syringeType: prev.syringeType,
        speedMlh: prev.speedMlh,
        volumeMl: prev.volumeMl,
        totalTimeSec: prev.elapsedTimeSec,
        infusedVolumeMl: prev.infusedVolumeMl,
        stepsCompleted: prev.stepsCompleted,
        stepsTotal: prev.totalSteps,
        status: 'STOPPED',
        timestamp: Date.now(),
        formattedTime: formatDemoTimestamp(Date.now()),
      }
      
      saveHistory([record, ...history])
      
      return {
        ...prev,
        state: 'MAIN',
        previousState: prev.state,
        pumping: false,
        paused: false,
        stepsCompleted: 0,
        elapsedTimeSec: 0,
        infusedVolumeMl: 0,
        progressPercent: 0,
      }
    })
  }, [clearAllTimers, history, saveHistory])

  // Rehome
  const rehome = useCallback(() => {
    prepare()
  }, [prepare])

  // Trigger occlusion error
  const triggerOcclusion = useCallback(() => {
    setState(prev => ({
      ...prev,
      state: 'ERROR',
      previousState: prev.state,
      errorType: 'OCCLUSION',
      pumping: false,
      paused: true,
      buzzerOn: true,
      fsrRaw: FSR_THRESHOLDS.occlusion.min + 500,
    }))
  }, [])

  // Reset alarm
  const resetAlarm = useCallback(() => {
    setState(prev => ({
      ...prev,
      errorType: null,
      buzzerOn: false,
      fsrRaw: prev.contactFound ? FSR_THRESHOLDS.contact.min + 50 : 50,
    }))
  }, [])

  // Complete and save to history
  useEffect(() => {
    if (state.state === 'DONE' && state.previousState === 'RESULT') {
      const record: DemoHistoryRecord = {
        id: Date.now().toString(),
        syringeType: state.syringeType,
        speedMlh: state.speedMlh,
        volumeMl: state.volumeMl,
        totalTimeSec: state.elapsedTimeSec,
        infusedVolumeMl: state.infusedVolumeMl,
        stepsCompleted: state.stepsCompleted,
        stepsTotal: state.totalSteps,
        status: 'COMPLETED',
        timestamp: Date.now(),
        formattedTime: formatDemoTimestamp(Date.now()),
      }
      
      saveHistory([record, ...history])
      
      // Buzzer pulses
      let pulseCount = 0
      const buzzerInterval = setInterval(() => {
        setState(prev => ({ ...prev, buzzerOn: !prev.buzzerOn }))
        pulseCount++
        if (pulseCount >= 6) {
          clearInterval(buzzerInterval)
          setState(prev => ({ ...prev, buzzerOn: false }))
        }
      }, STATE_TIMINGS.buzzerPulse + STATE_TIMINGS.buzzerGap)
    }
  }, [state.state, state.previousState])

  // Go back to main
  const goBack = useCallback(() => {
    clearAllTimers()
    setState(prev => ({
      ...prev,
      state: 'MAIN',
      previousState: prev.state,
      pumping: false,
      paused: false,
      errorType: null,
      buzzerOn: false,
    }))
  }, [clearAllTimers])

  // Reset entire demo
  const resetDemo = useCallback(() => {
    clearAllTimers()
    setState({
      ...INITIAL_DEMO_STATE,
      state: 'BOOT',
    })
    
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        state: 'SYRINGE',
        previousState: 'BOOT',
      }))
    }, STATE_TIMINGS.boot)
  }, [clearAllTimers])

  // Run auto demo script
  const runAutoDemo = useCallback(async () => {
    clearAllTimers()
    setState(prev => ({ ...prev, isAutoDemo: true, autoDemoStep: 0 }))
    
    // Step 1: Boot
    boot()
    
    await new Promise(r => setTimeout(r, 2000))
    
    // Step 2: Select syringe
    selectSyringe('10CC')
    setState(prev => ({ ...prev, autoDemoStep: 1 }))
    
    await new Promise(r => setTimeout(r, 1000))
    
    // Step 3: Go to setup
    gotoSetup()
    setState(prev => ({ ...prev, autoDemoStep: 2 }))
    
    await new Promise(r => setTimeout(r, 800))
    
    // Step 4: Set config
    updateConfig(5.0, 2.0)
    setState(prev => ({ ...prev, autoDemoStep: 3 }))
    
    await new Promise(r => setTimeout(r, 1000))
    
    // Step 5: Prepare
    prepare()
    setState(prev => ({ ...prev, autoDemoStep: 4 }))
    
    await new Promise(r => setTimeout(r, 4000))
    
    // Step 6: Start
    start()
    setState(prev => ({ ...prev, autoDemoStep: 5 }))
    
    await new Promise(r => setTimeout(r, 6000))
    
    // Step 7: Pause
    pause()
    setState(prev => ({ ...prev, autoDemoStep: 6 }))
    
    await new Promise(r => setTimeout(r, 2000))
    
    // Step 8: Resume
    resume()
    setState(prev => ({ ...prev, autoDemoStep: 7 }))
    
    // Let it complete naturally
    setState(prev => ({ ...prev, isAutoDemo: false }))
    
  }, [boot, selectSyringe, gotoSetup, updateConfig, prepare, start, pause, resume, clearAllTimers])

  // Update control flags
  const updateControlFlags = useCallback((flags: Partial<DemoControlFlags>) => {
    setControlFlags(prev => ({ ...prev, ...flags }))
    
    if (flags.manualFsrValue !== undefined) {
      setState(prev => ({ ...prev, fsrRaw: flags.manualFsrValue! }))
    }
    if (flags.manualContactDetected !== undefined) {
      setState(prev => ({ ...prev, contactFound: flags.manualContactDetected! }))
    }
    if (flags.manualLimitPressed !== undefined) {
      setState(prev => ({ ...prev, limitPressed: flags.manualLimitPressed! }))
    }
  }, [])

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem(HISTORY_KEY)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllTimers()
  }, [clearAllTimers])

  // Remaining time calculation
  const remainingTimeSec = state.estimatedTimeSec - state.elapsedTimeSec

  return {
    state,
    controlFlags,
    history,
    presentationMode,
    remainingTimeSec: Math.max(0, remainingTimeSec),
    
    // Actions
    boot,
    selectSyringe,
    gotoSetup,
    updateConfig,
    prepare,
    start,
    pause,
    resume,
    stop,
    rehome,
    triggerOcclusion,
    resetAlarm,
    goBack,
    resetDemo,
    runAutoDemo,
    clearHistory,
    
    // Control
    updateControlFlags,
    setPresentationMode,
  }
}
