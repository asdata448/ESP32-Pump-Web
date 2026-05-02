import { NextResponse } from 'next/server'
import { mockState, setMockState } from '../status/route'

export async function POST() {
  if (!mockState.homed) {
    return NextResponse.json({ error: 'Machine not homed' }, { status: 400 })
  }

  setMockState({
    state: 'PREPARE',
    contact_found: false,
  })

  // Simulate preparation delay
  setTimeout(() => {
    setMockState({
      state: 'READY',
      contact_found: true,
    })
  }, 2000)

  return NextResponse.json({ status: 'ok' })
}
