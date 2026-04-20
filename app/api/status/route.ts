import { NextResponse } from 'next/server'
import type { PumpStatus, PumpState } from '@/lib/pump-types'

// In-memory state for mock API
let mockState: PumpStatus = {
  state: 'MAIN',
  syringe: '10CC',
  syringe_index: 0,
  speed_mlh: 1.0,
  volume_ml: 5,
  remaining_sec: 0,
  steps_completed: 0,
  steps_total: 5000,
  homed: true,
  contact_found: false,
  fsr_alert: false,
  pump_running: false,
  paused: false,
  fsr_raw: Math.floor(200 + Math.random() * 200),
  fsr_presence_threshold: 450,
  fsr_occlusion_threshold: 2000,
  limit_pressed: false,
  buzzer_on: false,
  ip: '192.168.4.1',
  wifi_mode: 'AP',
}

// Simulate running pump
let lastUpdate = Date.now()

function updateMockState() {
  const now = Date.now()
  const elapsed = (now - lastUpdate) / 1000
  lastUpdate = now

  // Update FSR with some random noise
  mockState.fsr_raw = Math.floor(200 + Math.random() * 200 + Math.sin(now / 1000) * 50)

  // If pump is running, update progress
  if (mockState.pump_running && !mockState.paused) {
    // Calculate steps per second based on speed
    const mlPerSec = mockState.speed_mlh / 3600
    const mmPerSec = mlPerSec * (mockState.syringe === '10CC' ? 5.0 : 3.33)
    const stepsPerSec = (mmPerSec / 8) * 1600 // lead screw pitch 8mm, 1600 steps/rev
    
    mockState.steps_completed = Math.min(
      mockState.steps_total,
      mockState.steps_completed + Math.floor(stepsPerSec * elapsed)
    )

    // Update remaining time
    const remainingSteps = mockState.steps_total - mockState.steps_completed
    mockState.remaining_sec = Math.ceil(remainingSteps / stepsPerSec)

    // Check if done
    if (mockState.steps_completed >= mockState.steps_total) {
      mockState.pump_running = false
      mockState.state = 'DONE'
      mockState.remaining_sec = 0
    }
  }
}

export async function GET() {
  updateMockState()
  return NextResponse.json(mockState)
}

// Export for other routes to use
export { mockState }
export function setMockState(updates: Partial<PumpStatus>) {
  mockState = { ...mockState, ...updates }
  lastUpdate = Date.now()
}
