// ═══════════════════════════════════════════════════════════════════════════
// PATIENT MANAGEMENT API - Individual Session Routes
// ═══════════════════════════════════════════════════════════════════════════
// API endpoints for individual pump session operations
//
// Endpoints:
// - GET    /api/patients/[id]/sessions/[sessionId] - Get specific session
// - PATCH  /api/patients/[id]/sessions/[sessionId] - Update session
// - DELETE /api/patients/[id]/sessions/[sessionId] - Delete session
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import {
  type PumpSession,
  type PumpSessionUpdate,
  type ApiResponse,
} from '@/lib/patient-types'
import {
  updatePumpSession,
  calculateSessionDuration,
  formatDuration,
  getSessionStatusDisplay,
} from '@/lib/patient-utils'

// In-memory storage (replace with Firebase in production)
// This would be shared with the main route.ts file
let sessions: PumpSession[] = []

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/patients/[id]/sessions/[sessionId] - Get specific session
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get a specific pump session
 *
 * URL parameters:
 * - id: patient ID
 * - sessionId: session ID
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "sessionNumber": 1,
 *     "patientId": "BN-150590-123456",
 *     "pumpId": "PUMP-001",
 *     ...
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await params

    // Find session
    const session = sessions.find(
      (s) => s.id === sessionId && s.patientId === id
    )

    if (!session) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Không tìm thấy phiên bơm với ID ${sessionId}`,
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    const response: ApiResponse<PumpSession> = {
      success: true,
      data: session,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting pump session:', error)

    const errorResponse: ApiResponse<null> = {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Lỗi server khi lấy thông tin phiên bơm',
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PATCH /api/patients/[id]/sessions/[sessionId] - Update session
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update pump session (status, progress, etc.)
 *
 * URL parameters:
 * - id: patient ID
 * - sessionId: session ID
 *
 * Request body (all fields optional):
 * {
 *   "endTime": "15:30:00",
 *   "infusedVolume": 15.5,
 *   "status": "COMPLETED",
 *   "errorDetails": "Occlusion detected",
 *   "stoppedBy": "user123"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "sessionNumber": 1,
 *     "infusedVolume": 15.5,
 *     "status": "COMPLETED",
 *     "durationSeconds": 3600,
 *     "durationFormatted": "1h 0p"
 *   }
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await params

    // Find session
    const sessionIndex = sessions.findIndex(
      (s) => s.id === sessionId && s.patientId === id
    )

    if (sessionIndex === -1) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Không tìm thấy phiên bơm với ID ${sessionId}`,
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    // Get update data
    const updateData: PumpSessionUpdate = await request.json()
    const session = sessions[sessionIndex]

    // Calculate duration if endTime is provided
    if (updateData.endTime) {
      const duration = calculateSessionDuration(
        session.startTime,
        updateData.endTime
      )
      if (duration !== null) {
        updateData.durationSeconds = duration
        updateData.durationFormatted = formatDuration(duration)
      }
    }

    // Update session
    const updatedSession = updatePumpSession(session, updateData)

    // Update in array
    sessions[sessionIndex] = updatedSession

    const response: ApiResponse<PumpSession> = {
      success: true,
      data: updatedSession,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating pump session:', error)

    const errorResponse: ApiResponse<null> = {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Lỗi server khi cập nhật phiên bơm',
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/patients/[id]/sessions/[sessionId] - Delete session
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Delete a pump session
 *
 * URL parameters:
 * - id: patient ID
 * - sessionId: session ID
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "deleted": true,
 *     "sessionId": "session-1234567890"
 *   }
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await params

    // Find session
    const sessionIndex = sessions.findIndex(
      (s) => s.id === sessionId && s.patientId === id
    )

    if (sessionIndex === -1) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Không tìm thấy phiên bơm với ID ${sessionId}`,
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    // Delete session
    sessions.splice(sessionIndex, 1)

    const response: ApiResponse<any> = {
      success: true,
      data: {
        deleted: true,
        sessionId,
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error deleting pump session:', error)

    const errorResponse: ApiResponse<null> = {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Lỗi server khi xóa phiên bơm',
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SPECIAL ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/patients/[id]/sessions/[sessionId]/start
 * Start a scheduled session
 */
export async function POST_start(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await params

    const sessionIndex = sessions.findIndex(
      (s) => s.id === sessionId && s.patientId === id
    )

    if (sessionIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    const session = sessions[sessionIndex]

    if (session.status !== 'SCHEDULED' && session.status !== 'PAUSED') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot start session with status ${session.status}`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    const updatedSession = updatePumpSession(session, { status: 'RUNNING' })
    sessions[sessionIndex] = updatedSession

    return NextResponse.json({
      success: true,
      data: updatedSession,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error starting session:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Error starting session',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/patients/[id]/sessions/[sessionId]/pause
 * Pause a running session
 */
export async function POST_pause(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await params

    const sessionIndex = sessions.findIndex(
      (s) => s.id === sessionId && s.patientId === id
    )

    if (sessionIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    const session = sessions[sessionIndex]

    if (session.status !== 'RUNNING') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot pause session with status ${session.status}`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    const updatedSession = updatePumpSession(session, { status: 'PAUSED' })
    sessions[sessionIndex] = updatedSession

    return NextResponse.json({
      success: true,
      data: updatedSession,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error pausing session:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Error pausing session',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/patients/[id]/sessions/[sessionId]/stop
 * Stop a running session
 */
export async function POST_stop(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await params

    const sessionIndex = sessions.findIndex(
      (s) => s.id === sessionId && s.patientId === id
    )

    if (sessionIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    const session = sessions[sessionIndex]

    if (session.status !== 'RUNNING' && session.status !== 'PAUSED') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot stop session with status ${session.status}`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    const now = new Date()
    const endTime = now.toTimeString().slice(0, 8) // HH:mm:ss
    const duration = calculateSessionDuration(session.startTime, endTime)

    const updatedSession = updatePumpSession(session, {
      status: 'STOPPED',
      endTime,
      durationSeconds: duration || undefined,
      durationFormatted: duration ? formatDuration(duration) : undefined,
      stoppedBy: 'user', // TODO: Get from auth
    })

    sessions[sessionIndex] = updatedSession

    return NextResponse.json({
      success: true,
      data: updatedSession,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error stopping session:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Error stopping session',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
