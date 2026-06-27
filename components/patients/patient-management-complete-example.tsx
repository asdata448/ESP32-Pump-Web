'use client'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PATIENT MANAGEMENT - COMPLETE FEATURE DEMO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This example demonstrates ALL features of the patient management components:
 * - Patient search with real-time filtering
 * - Patient registration
 * - Patient info display with CRUD operations
 * - Pump history table with advanced filtering
 * - Firebase real-time integration
 * - Export functionality
 * - Responsive design
 * - Error handling
 * - Loading states
 *
 * Copy this code to your page and customize Firebase functions.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { UserPlus, RefreshCw, FileText, Database, Search } from 'lucide-react'

import {
  PatientSearchBar,
  PatientInfoCard,
  PumpHistoryTable,
  PatientRegistrationDialog,
  type Patient,
  type PumpHistoryEntry,
  type PatientSearchResult,
} from '@/components/patients'

import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'

import { getFirestoreDB } from '@/lib/firebase'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA (Replace with real Firebase calls)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_PATIENTS: Patient[] = [
  {
    id: '1',
    patientId: 'BN-240616-1234',
    fullName: 'Nguyễn Văn An',
    dateOfBirth: new Date('1985-03-15'),
    gender: 'male',
    weight: 70,
    createdAt: new Date('2024-06-16'),
  },
  {
    id: '2',
    patientId: 'BN-240616-5678',
    fullName: 'Trần Thị Bình',
    dateOfBirth: new Date('1990-07-22'),
    gender: 'female',
    weight: 55,
    createdAt: new Date('2024-06-16'),
  },
]

const MOCK_HISTORY: PumpHistoryEntry[] = [
  {
    id: '2024-06-16-001',
    patientId: 'BN-240616-1234',
    deviceId: 'ESP32-001',
    syringeType: '20CC',
    speedMlh: 5.0,
    volumeMl: 20.0,
    infusedVolumeMl: 18.5,
    totalTimeSec: 13200,
    status: 'COMPLETED',
    timestamp: new Date('2024-06-16T10:30:00'),
    dataSource: 'real',
  },
  {
    id: '2024-06-16-002',
    patientId: 'BN-240616-1234',
    deviceId: 'ESP32-001',
    syringeType: '20CC',
    speedMlh: 10.0,
    volumeMl: 20.0,
    infusedVolumeMl: 20.0,
    totalTimeSec: 7200,
    status: 'COMPLETED',
    timestamp: new Date('2024-06-16T14:15:00'),
    dataSource: 'real',
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PatientManagementCompleteExample() {
  const db = getFirestoreDB()

  // State
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false)
  const [patientHistory, setPatientHistory] = useState<PumpHistoryEntry[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [useRealFirebase, setUseRealFirebase] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')

  // ═════════════════════════════════════════════════════════════════════════
  // FIREBASE FUNCTIONS (Implement these in your app)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Search patients by query (patient ID or name)
   */
  const searchPatients = useCallback(async (query: string): Promise<PatientSearchResult[]> => {
    if (!useRealFirebase) {
      // Mock search
      return MOCK_PATIENTS
        .filter(
          (p) =>
            p.patientId.toLowerCase().includes(query.toLowerCase()) ||
            p.fullName.toLowerCase().includes(query.toLowerCase())
        )
        .map((patient) => ({
          patient,
          matchScore: 0.9,
          matchFields: ['patientId', 'fullName'] as any,
        }))
    }

    try {
      // Firebase search
      const q = query(
        collection(db, 'patients'),
        where('patientId', '>=', query),
        where('patientId', '<=', query + '')
      )
      const snapshot = await getDocs(q)

      return snapshot.docs.map((doc) => ({
        patient: {
          id: doc.id,
          ...doc.data(),
          dateOfBirth: doc.data().dateOfBirth instanceof Date
            ? doc.data().dateOfBirth
            : doc.data().dateOfBirth.toDate(),
        } as Patient,
        matchScore: 0.9,
        matchFields: ['patientId'] as any,
      }))
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Lỗi tìm kiếm bệnh nhân')
      return []
    }
  }, [db, useRealFirebase])

  /**
   * Register new patient
   */
  const registerPatient = useCallback(async (patientData: any) => {
    if (!useRealFirebase) {
      // Mock registration
      const newPatientId = `BN-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`
      toast.success(`Đã đăng ký: ${newPatientId}`)
      return newPatientId
    }

    try {
      setIsRegistering(true)
      const docRef = await addDoc(collection(db, 'patients'), {
        ...patientData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
      toast.success(`Đã đăng ký: ${docRef.id}`)
      return docRef.id
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Đăng ký thất bại')
      throw error
    } finally {
      setIsRegistering(false)
    }
  }, [db, useRealFirebase])

  /**
   * Get patient pump history
   */
  const getPatientHistory = useCallback(async (patientId: string) => {
    if (!useRealFirebase) {
      // Mock data
      return MOCK_HISTORY.filter((h) => h.patientId === patientId)
    }

    try {
      const q = query(
        collection(db, 'pump_history'),
        where('patientId', '==', patientId),
        orderBy('timestamp', 'desc'),
        limit(50)
      )
      const snapshot = await getDocs(q)

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp instanceof Date
          ? doc.data().timestamp
          : doc.data().timestamp.toDate(),
      })) as PumpHistoryEntry[]
    } catch (error) {
      console.error('Get history error:', error)
      throw error
    }
  }, [db, useRealFirebase])

  /**
   * Subscribe to real-time history updates
   */
  const subscribeToHistory = useCallback((patientId: string, callback: (data: PumpHistoryEntry[]) => void) => {
    if (!useRealFirebase) {
      // Mock subscription - no-op
      return () => {}
    }

    const q = query(
      collection(db, 'pump_history'),
      where('patientId', '==', patientId),
      orderBy('timestamp', 'desc'),
      limit(50)
    )

    return onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp instanceof Date
          ? doc.data().timestamp
          : doc.data().timestamp.toDate(),
      })) as PumpHistoryEntry[]
      callback(history)
    })
  }, [db, useRealFirebase])

  /**
   * Update patient information
   */
  const updatePatient = useCallback(async (patient: Patient) => {
    if (!useRealFirebase) {
      toast.success('Đã cập nhật thông tin')
      return true
    }

    try {
      await updateDoc(doc(db, 'patients', patient.id), {
        ...patient,
        updatedAt: Timestamp.now(),
      })
      toast.success('Đã cập nhật thông tin')
      return true
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Cập nhật thất bại')
      return false
    }
  }, [db, useRealFirebase])

  /**
   * Delete patient
   */
  const deletePatient = useCallback(async (patientId: string) => {
    if (!useRealFirebase) {
      toast.success('Đã xóa bệnh nhân')
      return true
    }

    try {
      await deleteDoc(doc(db, 'patients', patientId))
      toast.success('Đã xóa bệnh nhân')
      return true
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Xóa thất bại')
      return false
    }
  }, [db, useRealFirebase])

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handlePatientSelect = useCallback(async (patient: Patient) => {
    setSelectedPatient(patient)
    setIsLoadingHistory(true)
    setHistoryError(null)

    try {
      const history = await getPatientHistory(patient.patientId)
      setPatientHistory(history)
    } catch (error) {
      console.error('Error loading history:', error)
      setHistoryError('Không thể tải lịch sử')
      toast.error('Lỗi tải lịch sử')
    } finally {
      setIsLoadingHistory(false)
    }
  }, [getPatientHistory])

  const handleRegisterNew = useCallback((patientData: any) => {
    registerPatient(patientData)
      .then((patientId) => {
        // Auto-select the new patient
        const newPatient: Patient = {
          id: patientId,
          patientId: patientId,
          ...patientData,
        }
        handlePatientSelect(newPatient)
        setShowRegistrationDialog(false)
      })
      .catch(() => {
        // Error already handled in registerPatient
      })
  }, [registerPatient, handlePatientSelect])

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL-TIME UPDATES
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!selectedPatient || !useRealFirebase) return

    const unsubscribe = subscribeToHistory(selectedPatient.patientId, (history) => {
      setPatientHistory(history)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [selectedPatient, subscribeToHistory, useRealFirebase])

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Quản lý bệnh nhân
          </h1>
          <p className="text-muted-foreground mt-1">
            Tìm kiếm, đăng ký và theo dõi lịch sử truyền dịch
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Firebase Toggle */}
          <Button
            variant="outline"
            onClick={() => setUseRealFirebase(!useRealFirebase)}
            className={cn(
              'medical-button-outline',
              useRealFirebase ? 'border-primary text-primary' : ''
            )}
            size="sm"
          >
            <Database className="h-4 w-4 mr-2" />
            {useRealFirebase ? 'Firebase Mode' : 'Demo Mode'}
          </Button>

          {/* Register Button */}
          <Button
            onClick={() => setShowRegistrationDialog(true)}
            className="medical-button"
            disabled={isRegistering}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {isRegistering ? 'Đang lưu...' : 'Đăng ký mới'}
          </Button>
        </div>
      </div>

      {/* Mode Indicator */}
      {useRealFirebase && (
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            Đang sử dụng Firebase - Dữ liệu sẽ được lưu vào Firestore Database
          </AlertDescription>
        </Alert>
      )}

      {/* Patient Search */}
      <Card className="medical-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="h-5 w-5" />
            Tìm kiếm bệnh nhân
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PatientSearchBar
            onPatientSelect={handlePatientSelect}
            onRegisterNew={() => setShowRegistrationDialog(true)}
            searchFunction={searchPatients}
            placeholder="Nhập mã bệnh nhân hoặc tên..."
          />
        </CardContent>
      </Card>

      {/* Patient Details & History */}
      {selectedPatient ? (
        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">
              Thông tin bệnh nhân
            </TabsTrigger>
            <TabsTrigger value="history">
              Lịch sử truyền dịch
              {patientHistory.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {patientHistory.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Patient Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <PatientInfoCard
              patient={selectedPatient}
              onEdit={updatePatient}
              onDelete={deletePatient}
              showActions
            />

            {/* Additional Info Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="medical-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground">
                    Thống kê nhanh
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tổng số lần truyền:</span>
                      <span className="text-white font-medium">{patientHistory.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hoàn thành:</span>
                      <span className="text-success font-medium">
                        {patientHistory.filter((h) => h.status === 'COMPLETED').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tổng thể tích:</span>
                      <span className="text-white font-medium">
                        {patientHistory.reduce((sum, h) => sum + h.infusedVolumeMl, 0).toFixed(1)} ml
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="medical-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground">
                    Hoạt động gần đây
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {patientHistory.length > 0 ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lần truyền cuối:</span>
                        <span className="text-white">
                          {new Intl.DateTimeFormat('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(patientHistory[0].timestamp)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Trạng thái:</span>
                        <Badge variant="secondary" className="text-xs">
                          {patientHistory[0].status === 'COMPLETED' ? 'Hoàn thành' : patientHistory[0].status}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Chưa có lịch sử</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pump History Tab */}
          <TabsContent value="history" className="space-y-4">
            {historyError && (
              <Alert variant="destructive">
                <AlertDescription>{historyError}</AlertDescription>
              </Alert>
            )}

            <PumpHistoryTable
              data={patientHistory}
              isLoading={isLoadingHistory}
              onRowClick={(entry) => {
                console.log('View details:', entry)
                toast.info(`Chi tiết: ${entry.id}`)
              }}
              onPatientClick={(patientId) => {
                console.log('Patient:', patientId)
              }}
              showFilters
              showExport
              realTime={useRealFirebase}
            />
          </TabsContent>
        </Tabs>
      ) : (
        /* Empty State */
        <Card className="medical-card">
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Chưa chọn bệnh nhân
                </h3>
                <p className="text-muted-foreground mb-4">
                  Tìm kiếm bệnh nhân hoặc đăng ký bệnh nhân mới
                </p>
              </div>
              <Button
                onClick={() => setShowRegistrationDialog(true)}
                className="medical-button"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Đăng ký bệnh nhân mới
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registration Dialog */}
      <PatientRegistrationDialog
        isOpen={showRegistrationDialog}
        onClose={() => setShowRegistrationDialog(false)}
        onSuccess={handleRegisterNew}
      />

      {/* Feature List */}
      <Card className="medical-card bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            Tính năng đã triển khai
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>Tìm kiếm real-time</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>Đăng ký bệnh nhân</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>Hiển thị thông tin</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>Chỉnh sửa bệnh nhân</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>Xóa bệnh nhân</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>Lịch sử truyền dịch</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>Bộ lọc nâng cao</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>Sắp xếp cột</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>Xuất CSV</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>Phân trang</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>Real-time updates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>Responsive design</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
