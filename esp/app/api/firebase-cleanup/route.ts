import { NextResponse } from 'next/server'
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  query,
  where,
  doc,
} from 'firebase/firestore'
import { getFirestoreDB } from '@/lib/firebase'

/**
 * API endpoint để cleanup dữ liệu Firebase
 * DELETE /api/firebase-cleanup?type=demo|real|all&before=YYYY-MM-DD
 */
export async function DELETE(request: Request) {
  try {
    const db = getFirestoreDB()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // demo, real, or all
    const before = searchParams.get('before') // YYYY-MM-DD format

    // Build query
    let q = collection(db, 'pump_history')

    if (type === 'demo') {
      q = query(q, where('dataSource', '==', 'demo'))
    } else if (type === 'real') {
      q = query(q, where('dataSource', '==', 'real'))
    }

    const snapshot = await getDocs(q)
    let docsToDelete = snapshot.docs

    // Filter by date if specified
    if (before) {
      const beforeDate = new Date(before)
      docsToDelete = docsToDelete.filter(doc => {
        const timestamp = doc.data().timestamp
        if (!timestamp) return false
        const docDate = timestamp.toDate()
        return docDate < beforeDate
      })
    }

    if (docsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không có bản ghi nào cần xóa',
        deleted: 0,
      })
    }

    // Delete in batches
    const batchSize = 500
    let deletedCount = 0

    for (let i = 0; i < docsToDelete.length; i += batchSize) {
      const batch = writeBatch(db)
      const end = Math.min(i + batchSize, docsToDelete.length)

      for (let j = i; j < end; j++) {
        batch.delete(docsToDelete[j].ref)
        deletedCount++
      }

      await batch.commit()
    }

    return NextResponse.json({
      success: true,
      message: `Đã xóa ${deletedCount} bản ghi ${type === 'demo' ? 'demo' : type === 'real' ? 'thật' : ''}`,
      deleted: deletedCount,
    })
  } catch (error: any) {
    console.error('[Firebase Cleanup] Error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi khi xóa dữ liệu',
        error: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/firebase-cleanup - Lấy thông tin về dữ liệu
 */
export async function GET() {
  try {
    const db = getFirestoreDB()
    const snapshot = await getDocs(collection(db, 'pump_history'))

    const stats = {
      total: snapshot.docs.length,
      demo: 0,
      real: 0,
      byDate: {} as Record<string, number>,
    }

    snapshot.docs.forEach(doc => {
      const data = doc.data()
      const dataSource = data.dataSource || 'unknown'

      if (dataSource === 'demo') stats.demo++
      else if (dataSource === 'real') stats.real++

      // Count by date
      const timestamp = data.timestamp
      if (timestamp) {
        const date = timestamp.toDate().toISOString().split('T')[0]
        stats.byDate[date] = (stats.byDate[date] || 0) + 1
      }
    })

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error: any) {
    console.error('[Firebase Cleanup] Error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi khi lấy thông tin dữ liệu',
        error: error.message,
      },
      { status: 500 }
    )
  }
}
