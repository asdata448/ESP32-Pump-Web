// ═══════════════════════════════════════════════════════════════════════════
// PATIENT MANAGEMENT API - Advanced Search
// ═══════════════════════════════════════════════════════════════════════════
// Advanced patient search with multiple filters
//
// Endpoint:
// - GET /api/patients/search - Advanced search with filters
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import {
  type PatientSearchQuery,
  type PatientSearchResponse,
  type ApiResponse,
} from '@/lib/patient-types'
import { calculateAge } from '@/lib/patient-utils'
import { searchPatientsInFirestore } from '@/lib/firebase-patients'

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/patients/search - Advanced search
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Advanced patient search with multiple filters
 *
 * Query parameters:
 * - q: string (search term - patient ID or name)
 * - gender: 'MALE' | 'FEMALE'
 * - minWeight: number (kg)
 * - maxWeight: number (kg)
 * - minAge: number (years)
 * - maxAge: number (years)
 * - dateOfBirthFrom: string (YYYY-MM-DD)
 * - dateOfBirthTo: string (YYYY-MM-DD)
 * - sortBy: 'createdAt' | 'name' | 'weight' | 'dateOfBirth'
 * - sortOrder: 'asc' | 'desc'
 * - limit: number (default 50)
 * - offset: number (default 0)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "results": [...],
 *     "total": 100,
 *     "hasMore": true,
 *     "query": {...}
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Build search query
    const query: PatientSearchQuery = {
      searchTerm: searchParams.get('q') || undefined,
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

    // Additional advanced filters
    const minAge = searchParams.get('minAge')
      ? parseInt(searchParams.get('minAge')!)
      : undefined
    const maxAge = searchParams.get('maxAge')
      ? parseInt(searchParams.get('maxAge')!)
      : undefined
    const dateOfBirthFrom = searchParams.get('dateOfBirthFrom') || undefined
    const dateOfBirthTo = searchParams.get('dateOfBirthTo') || undefined
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Search patients in Firebase
    const { results: patientResults, total } = await searchPatientsInFirestore(query)

    // Transform to search results with calculated fields
    const results = patientResults.map((patient) => ({
      ...patient,
      age: calculateAge(patient.dateOfBirth),
    }))

    const searchResponse: PatientSearchResponse = {
      results,
      total,
      hasMore: query.offset + query.limit < total,
      query,
    }

    const response: ApiResponse<PatientSearchResponse> = {
      success: true,
      data: searchResponse,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error searching patients:', error)

    const errorResponse: ApiResponse<null> = {
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: 'Lỗi khi tìm kiếm bệnh nhân',
        details: error instanceof Error ? error.message : undefined,
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}
