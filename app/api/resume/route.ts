import { NextResponse } from 'next/server'
import { mockState, setMockState } from '../status/route'

export async function POST() {
  if (!mockState.pump_running || !mockState.paused) {
    return NextResponse.json({ error: 'Pump not paused' }, { status: 400 })
  }

  setMockState({
    paused: false,
  })

  return NextResponse.json({ status: 'ok' })
}
