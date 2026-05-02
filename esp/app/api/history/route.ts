import { NextResponse } from 'next/server'
import type { HistoryEntry } from '@/lib/pump-types'

// Mock history data
const history: HistoryEntry[] = [
  { speed_mlh: 1.0, volume_ml: 5, total_sec: 18000, syringe: '10CC' },
  { speed_mlh: 2.5, volume_ml: 3, total_sec: 4320, syringe: '20CC' },
  { speed_mlh: 0.5, volume_ml: 10, total_sec: 72000, syringe: '10CC' },
  { speed_mlh: 1.5, volume_ml: 8, total_sec: 19200, syringe: '20CC' },
  { speed_mlh: 3.0, volume_ml: 2, total_sec: 2400, syringe: '10CC' },
]

export async function GET() {
  return NextResponse.json(history.slice(0, 5))
}

// Export to add history entries
export function addHistoryEntry(entry: HistoryEntry) {
  history.unshift(entry)
  if (history.length > 10) {
    history.pop()
  }
}
