import { NextResponse } from 'next/server'
import { testFirebaseConnection } from '@/lib/firebase'

export async function GET() {
  const result = await testFirebaseConnection()
  return NextResponse.json(result)
}
