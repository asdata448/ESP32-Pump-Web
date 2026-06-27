import { NextResponse } from 'next/server'
import { savePumpHistory, createPumpHistoryRecord } from '@/lib/firebase'
import { mockState } from '../status/route'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { deviceId, overrideData, patientId, patientName } = body

    // Get current state from ESP32 or use override data
    const currentState = overrideData || mockState

    // Validate required fields
    if (!currentState) {
      return NextResponse.json({ error: 'No state available' }, { status: 400 })
    }

    // Calculate infused volume from progress
    const phanTram = currentState.steps_total > 0
      ? (currentState.steps_completed / currentState.steps_total) * 100
      : 0

    const mlDaTruyen = currentState.steps_total > 0
      ? (phanTram / 100) * currentState.volume_ml
      : 0

    // Calculate total time (actual time spent pumping)
    const totalTimeSec = Math.round((mlDaTruyen / currentState.speed_mlh) * 3600)

    // Determine status based on current state
    let status: 'COMPLETED' | 'STOPPED' | 'ERROR' = 'STOPPED'
    if (currentState.state === 'DONE') {
      status = 'COMPLETED'
    } else if (currentState.state === 'ERROR' || currentState.fsr_alert) {
      status = 'ERROR'
    }

    // Create record
    const record = createPumpHistoryRecord({
      syringeType: currentState.syringe || '10CC',
      speedMlh: currentState.speed_mlh || 0,
      volumeMl: currentState.volume_ml || 0,
      infusedVolumeMl: mlDaTruyen,
      totalTimeSec: totalTimeSec,
      stepsCompleted: currentState.steps_completed,
      stepsTotal: currentState.steps_total,
      status: status,
      deviceId: deviceId || 'esp32-pump-default',
      notes: body.notes || undefined,
      errorType: currentState.fsr_alert ? 'OCCLUSION_DETECTED' : undefined,
      // Patient linkage (optional — only when a patient is selected)
      patientId: patientId || undefined,
      patientName: patientName || undefined,
    })

    // Save to Firebase
    const docId = await savePumpHistory({
      ...record,
      dataSource: 'real',
    })

    if (docId) {
      return NextResponse.json({
        status: 'ok',
        docId: docId,
        message: 'Đã lưu vào Firebase thành công',
        data: {
          syringeType: record.syringeType,
          speedMlh: record.speedMlh,
          volumeMl: record.volumeMl,
          infusedVolumeMl: record.infusedVolumeMl,
          totalTimeSec: record.totalTimeSec,
          status: record.status,
          percentage: phanTram.toFixed(1),
        }
      })
    } else {
      return NextResponse.json({ error: 'Không thể lưu vào Firebase' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error saving to Firebase:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
