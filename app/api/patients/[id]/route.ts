// ═══════════════════════════════════════════════════════════════════════════
// PATIENT MANAGEMENT API - Individual Patient Routes
// ═══════════════════════════════════════════════════════════════════════════
// API endpoints for individual patient operations
//
// Endpoints:
// - GET  /api/patients/[id]         - Get patient by ID
// - PUT  /api/patients/[id]         - Update patient
// - DELETE /api/patients/[id]       - Delete patient
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { type Patient, type ApiResponse } from '@/lib/patient-types'
import { isValidPatientId, calculateAge } from '@/lib/patient-utils'
import {
  getPatientFromFirestore,
  updatePatientInFirestore,
  deletePatientFromFirestore,
} from '@/lib/firebase-patients'

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/patients/[id] - Get patient by ID
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get patient information by ID
 *
 * URL parameter: id (patient ID, e.g., "BN-150590-123456")
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "patientId": "BN-150590-123456",
 *     "fullName": "Nguyễn Văn A",
 *     "dateOfBirth": "1990-05-15",
 *     "gender": "MALE",
 *     "weight": 70.5,
 *     "age": 36,
 *     ...
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
          message: 'Mã bệnh nhân không hợp lệ. Định dạng: BN-DDMMYY-HHMMSS',
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Fetch patient from Firebase
    const patient = await getPatientFromFirestore(id)

    if (!patient) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: `Không tìm thấy bệnh nhân với mã ${id}`,
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    // Add calculated age to response
    const patientWithAge = {
      ...patient,
      age: calculateAge(patient.dateOfBirth),
    }

    const response: ApiResponse<any> = {
      success: true,
      data: patientWithAge,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting patient:', error)

    const errorResponse: ApiResponse<null> = {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Lỗi server khi lấy thông tin bệnh nhân',
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/patients/[id] - Update patient
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update patient information
 *
 * URL parameter: id (patient ID)
 *
 * Request body (all fields optional):
 * {
 *   "fullName": "Nguyễn Văn B",
 *   "weight": 75.0
 * }
 *
 * Note: Cannot update patientId or dateOfBirth (immutable fields)
 */
export async function PUT(
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

    // Check if patient exists
    const existingPatient = await getPatientFromFirestore(id)

    if (!existingPatient) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: `Không tìm thấy bệnh nhân với mã ${id}`,
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    // Get update data
    const updateData = await request.json()

    // Update patient in Firebase
    const updatedPatient = await updatePatientInFirestore(id, updateData)

    if (!updatedPatient) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Lỗi khi cập nhật bệnh nhân',
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    const response: ApiResponse<Patient> = {
      success: true,
      data: updatedPatient,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating patient:', error)

    const errorResponse: ApiResponse<null> = {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Lỗi server khi cập nhật thông tin bệnh nhân',
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/patients/[id] - Delete patient
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Delete patient (and all associated sessions)
 *
 * URL parameter: id (patient ID)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "deleted": true,
 *     "patientId": "BN-150590-123456"
 *   }
 * }
 */
export async function DELETE(
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

    // Check if patient exists
    const existingPatient = await getPatientFromFirestore(id)

    if (!existingPatient) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: `Không tìm thấy bệnh nhân với mã ${id}`,
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    // Delete patient from Firebase
    const success = await deletePatientFromFirestore(id)

    if (!success) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Lỗi khi xóa bệnh nhân',
        },
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        deleted: true,
        patientId: id,
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error deleting patient:', error)

    const errorResponse: ApiResponse<null> = {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Lỗi server khi xóa bệnh nhân',
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}
