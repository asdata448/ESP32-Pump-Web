import { NextResponse } from 'next/server'
import type { PumpConfig } from '@/lib/pump-types'
import { mockState, setMockState } from '../status/route'

export async function GET() {
  const config: PumpConfig = {
    syringe_index: mockState.syringe_index,
    speed_mlh: mockState.speed_mlh,
    volume_ml: mockState.volume_ml,
  }
  return NextResponse.json(config)
}

export async function POST(request: Request) {
  try {
    const config: PumpConfig = await request.json()
    
    // Validate
    if (config.speed_mlh <= 0 || config.speed_mlh > 999) {
      return NextResponse.json({ error: 'Invalid speed' }, { status: 400 })
    }
    if (config.volume_ml <= 0 || config.volume_ml > 99) {
      return NextResponse.json({ error: 'Invalid volume' }, { status: 400 })
    }

    // Calculate total steps needed
    const syringeSpec = config.syringe_index === 0 ? 5.0 : 3.33 // mm/ml
    const totalMm = config.volume_ml * syringeSpec
    const totalSteps = Math.ceil((totalMm / 8) * 1600) // lead screw 8mm, 1600 steps/rev

    setMockState({
      syringe_index: config.syringe_index,
      syringe: config.syringe_index === 0 ? '10CC' : '20CC',
      speed_mlh: config.speed_mlh,
      volume_ml: config.volume_ml,
      steps_total: totalSteps,
      steps_completed: 0,
      remaining_sec: Math.ceil((config.volume_ml / config.speed_mlh) * 3600),
    })

    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
