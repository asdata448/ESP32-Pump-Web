import { NextResponse } from 'next/server'
import { mockState, setMockState } from '../status/route'

export async function POST() {
  if (!mockState.pump_running) {
    return NextResponse.json({ error: 'Pump not running' }, { status: 400 })
  }

  setMockState({
    paused: true,
  })

  return NextResponse.json({ status: 'ok' })
}
