import { NextResponse } from 'next/server'
import { setMockState } from '../status/route'

export async function POST() {
  setMockState({
    state: 'MAIN',
    fsr_alert: false,
    buzzer_on: false,
    pump_running: false,
    paused: false,
  })

  return NextResponse.json({ status: 'ok' })
}
