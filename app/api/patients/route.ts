// ═══════════════════════════════════════════════════════════════════════════
// PATIENT MANAGEMENT API - Main Patient Routes
// ═══════════════════════════════════════════════════════════════════════════
// API endpoints for patient registration, search, and retrieval
//
// Endpoints:
// - POST   /api/patients              - Register new patient
// - GET    /api/patients              - List/search patients
// - GET    /api/patients/[id]         - Get patient by ID
// - GET    /api/patients/[id]/sessions - Get patient pump sessions
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import {
  type Patient,
  type PatientRegistrationForm,
  type PatientRegistrationResponse,
  type PatientSearchQuery,
  type PatientSearchResponse,
  type ApiResponse,
  COLLECTIONS,
} from '@/lib/patient-types'
import {
  generatePatientId,
  validatePatientRegistration,
  isRegistrationValid,
  calculateAge,
} from '@/lib/patient-utils'
import { createPatientInFirestore, searchPatientsInFirestore } from '@/lib/firebase-patients'

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/patients - Register new patient
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Register a new patient
 *
 * Request body:
 * {
 *   "fullName": "Nguyễn Văn A",
 *   "dateOfBirth": "1990-05-15",
 *   "gender": "MALE",
 *   "weight": 70.5
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "patientId": "BN-150590-123456",
 *     "fullName": "Nguyễn Văn A",
 *     ...
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: PatientRegistrationForm = await request.json()

    // Validate form data
    const validationErrors = validatePatientRegistration(body)

    if (!isRegistrationValid(validationErrors)) {
      const response: PatientRegistrationResponse = {
        success: false,
        error: 'Dữ liệu không hợp lệ',
        validationErrors,
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Generate patient ID
    const patientId = generatePatientId()

    // Create patient in Firebase
    const patient = await createPatientInFirestore({
      patientId,
      ...body,
    })

    if (!patient) {
      const response: PatientRegistrationResponse = {
        success: false,
        error: 'Lỗi khi tạo bệnh nhân trong Firebase',
      }
      return NextResponse.json(response, { status: 500 })
    }

    // Return success response
    const response: PatientRegistrationResponse = {
      success: true,
      patient,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating patient:', error)

    const response: PatientRegistrationResponse = {
      success: false,
      error: 'Lỗi server khi đăng ký bệnh nhân',
    }

    return NextResponse.json(response, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/patients - List/Search patients
// ═══════════════════════════════════════════════════════════════════════════

/**
 * List or search patients
 *
 * Query parameters:
 * - searchTerm: string (search by patient ID or name)
 * - gender: 'MALE' | 'FEMALE'
 * - minWeight: number
 * - maxWeight: number
 * - limit: number (default 50)
 * - offset: number (default 0)
 *
 * Response:
 * {
 *   "results": [...],
 *   "total": 100,
 *   "hasMore": true,
 *   "query": {...}
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const query: PatientSearchQuery = {
      searchTerm: searchParams.get('searchTerm') || undefined,
      gender: searchParams.get('gender') as any,
      minWeight: searchParams.get('minWeight')
        ? parseFloat(searchParams.get('minWeight')!)
        : undefined,
      maxWeight: searchParams.get('maxWeight')
        ? parseFloat(searchParams.get('maxWeight')!)
        : undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : 50,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : 0,
    }

    // Search patients in Firebase
    const { results: patientResults, total } = await searchPatientsInFirestore(query)

    // Add calculated age to results
    const results = patientResults.map((patient) => ({
      ...patient,
      age: calculateAge(patient.dateOfBirth),
    }))

    const response: PatientSearchResponse = {
      results,
      total,
      hasMore: query.offset + query.limit < total,
      query,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error searching patients:', error)

    const errorResponse: ApiResponse<null> = {
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: 'Lỗi khi tìm kiếm bệnh nhân',
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}
