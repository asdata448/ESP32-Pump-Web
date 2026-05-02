import { NextResponse } from 'next/server'
import { setMockState } from '../status/route'

export async function POST() {
  setMockState({
    state: 'MAIN',
    pump_running: false,
    paused: false,
    steps_completed: 0,
    remaining_sec: 0,
    contact_found: false,
  })

  return NextResponse.json({ status: 'ok' })
}
