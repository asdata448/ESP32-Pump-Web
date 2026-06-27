// ═══════════════════════════════════════════════════════════════════════════
// PATIENT MANAGEMENT API - Pump Session Routes
// ═══════════════════════════════════════════════════════════════════════════
// API endpoints for patient pump session management
//
// Endpoints:
// - GET    /api/patients/[id]/sessions   - Get patient pump sessions
// - POST   /api/patients/[id]/sessions   - Create new pump session
// - GET    /api/patients/[id]/sessions/[sessionId] - Get specific session
// - PATCH  /api/patients/[id]/sessions/[sessionId] - Update session
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import {
  type PumpSession,
  type PumpSessionCreate,
  type ApiResponse,
} from '@/lib/patient-types'
import {
  isValidPatientId,
} from '@/lib/patient-utils'
import {
  createPumpSessionInFirestore,
  getNextSessionNumber,
} from '@/lib/firebase-patients'
import { getPumpHistoryByPatient, type PumpHistoryRecord } from '@/lib/firebase'

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/patients/[id]/sessions - Get patient pump sessions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all pump sessions for a patient
 *
 * URL parameter: id (patient ID)
 *
 * Query parameters:
 * - status: 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | etc. (optional filter)
 * - limit: number (default 50)
 * - offset: number (default 0)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "patientId": "BN-150590-123456",
 *     "patient": {...},
 *     "sessions": [...],
 *     "totalSessions": 5,
 *     "totalInfusedVolume": 45.5
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate patient ID format
    if (!isValidPatientId(id)) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_PATIENT_ID',
          message: 'Mã bệnh nhân không hợp lệ',
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50

    // Pump history lives in the `pump_history` collection, tagged with patientId.
    // Reuse that as the source of truth for a patient's pump sessions.
    const sessions = await getPumpHistoryByPatient(id, limit)

    // Calculate total infused volume from returned records
    const totalInfusedVolume = sessions.reduce(
      (sum, s) => sum + (typeof s.infusedVolumeMl === 'number' ? s.infusedVolumeMl : 0),
      0
    )

    const response: ApiResponse<{
      patientId: string
      sessions: PumpHistoryRecord[]
      totalSessions: number
      totalInfusedVolume: number
    }> = {
      success: true,
      data: {
        patientId: id,
        sessions,
        totalSessions: sessions.length,
        totalInfusedVolume: Number(totalInfusedVolume.toFixed(2)),
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting pump sessions:', error)

    // Surface Firestore index errors clearly so the user can create the index
    const message =
      error instanceof Error && error.message.toLowerCase().includes('index')
        ? 'Cần tạo Firestore composite index (patientId + timestamp). Xem link trong log server.'
        : 'Lỗi server khi lấy lịch sử bơm'

    const errorResponse: ApiResponse<null> = {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message,
        details: error instanceof Error ? error.message : undefined,
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/patients/[id]/sessions - Create new pump session
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a new pump session for a patient
 *
 * URL parameter: id (patient ID)
 *
 * Request body:
 * {
 *   "pumpId": "PUMP-001",
 *   "infusionDate": "2026-06-15",
 *   "startTime": "14:30:00",
 *   "configuredRate": 10.5,
 *   "configuredVolume": 20.0,
 *   "protocolId": "ADULT_ACUTE_SLOW",
 *   "protocolName": "Người lớn cấp cứu",
 *   "syringeType": "20CC",
 *   "notes": "Session notes"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "sessionNumber": 1,
 *     "patientId": "BN-150590-123456",
 *     ...
 *   }
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate patient ID format
    if (!isValidPatientId(id)) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_PATIENT_ID',
          message: 'Mã bệnh nhân không hợp lệ',
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Get session data
    const sessionData: PumpSessionCreate = await request.json()

    // Validate required fields
    if (
      !sessionData.pumpId ||
      !sessionData.infusionDate ||
      !sessionData.startTime ||
      !sessionData.configuredRate ||
      !sessionData.configuredVolume ||
      !sessionData.syringeType
    ) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message:
            'Thiếu thông tin bắt buộc: pumpId, infusionDate, startTime, configuredRate, configuredVolume, syringeType',
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Validate data types
    if (sessionData.configuredRate <= 0 || sessionData.configuredVolume <= 0) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_VALUES',
          message: 'Tốc độ và thể tích phải lớn hơn 0',
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Get next session number for this patient
    const nextSessionNumber = await getNextSessionNumber(id)

    // Create session in Firebase
    const session = await createPumpSessionInFirestore(
      id,
      sessionData,
      nextSessionNumber
    )

    if (!session) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: {
          code: 'CREATION_FAILED',
          message: 'Lỗi khi tạo phiên bơm',
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    const response: ApiResponse<PumpSession> = {
      success: true,
      data: session,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Error creating pump session:', error)

    const errorResponse: ApiResponse<null> = {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Lỗi server khi tạo phiên bơm',
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}
