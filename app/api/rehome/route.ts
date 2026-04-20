import { NextResponse } from 'next/server'
import { setMockState } from '../status/route'

export async function POST() {
  setMockState({
    state: 'BOOT',
    homed: false,
    contact_found: false,
    pump_running: false,
    paused: false,
    steps_completed: 0,
  })

  // Simulate homing process
  setTimeout(() => {
    setMockState({
      state: 'MAIN',
      homed: true,
    })
  }, 3000)

  return NextResponse.json({ status: 'ok' })
}
