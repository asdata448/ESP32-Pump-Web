import { NextResponse } from 'next/server'
import { mockState, setMockState } from '../status/route'

export async function POST() {
  if (mockState.state !== 'READY' && mockState.state !== 'PREPARE') {
    return NextResponse.json({ error: 'Not ready to start' }, { status: 400 })
  }

  // CRITICAL: User MUST run Prepare first to find piston
  // The ESP32 does NOT auto-find piston on start
  if (!mockState.contact_found) {
    return NextResponse.json({ error: 'No syringe contact. Please run Prepare first.' }, { status: 400 })
  }

  // Calculate remaining time based on config
  const remainingSec = Math.ceil((mockState.volume_ml / mockState.speed_mlh) * 3600)

  setMockState({
    state: 'RESULT',
    pump_running: true,
    paused: false,
    steps_completed: 0,
    remaining_sec: remainingSec,
  })

  return NextResponse.json({ status: 'ok' })
}
