'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { UserPlus, RefreshCw } from 'lucide-react'

import {
  PatientSearchBar,
  PatientInfoCard,
  PumpHistoryTable,
  type Patient,
  type PumpHistoryEntry,
} from './index'
import { PatientRegistrationDialog } from './patient-registration-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from '@/components/ui/spinner'

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT MANAGEMENT DASHBOARD - INTEGRATION EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════
//
// This is a complete example showing how to integrate all patient management
// components with Firebase real-time updates.
//
// Features:
// - Patient search with real-time filtering
// - Patient registration
// - Patient info display with edit/delete
// - Pump history table with sorting, filtering, pagination
// - Firebase real-time synchronization
// - Loading and error states
// - Responsive design
//
// ═══════════════════════════════════════════════════════════════════════════

interface PatientDashboardProps {
  // Firebase function to search patients
  searchPatients?: (query: string) => Promise<Patient[]>
  // Firebase function to register patient
  registerPatient?: (patient: any) => Promise<string>
  // Firebase function to get patient history
  getPatientHistory?: (patientId: string) => Promise<PumpHistoryEntry[]>
  // Firebase function to subscribe to history updates
  subscribeToHistory?: (patientId: string, callback: (data: PumpHistoryEntry[]) => void) => () => void
  // Firebase function to update patient
  updatePatient?: (patientId: string, data: any) => Promise<boolean>
  // Firebase function to delete patient
  deletePatient?: (patientId: string) => Promise<boolean>
}

export function PatientDashboardExample({
  searchPatients,
  registerPatient,
  getPatientHistory,
  subscribeToHistory,
  updatePatient,
  deletePatient,
}: PatientDashboardProps) {
  // State
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false)
  const [patientHistory, setPatientHistory] = useState<PumpHistoryEntry[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)

  // Handle patient selection
  const handlePatientSelect = useCallback(async (patient: Patient) => {
    setSelectedPatient(patient)
    setIsLoadingHistory(true)
    setHistoryError(null)

    try {
      if (getPatientHistory) {
        const history = await getPatientHistory(patient.patientId)
        setPatientHistory(history)
      }
    } catch (error) {
      console.error('Error loading patient history:', error)
      setHistoryError('Không thể tải lịch sử bệnh nhân')
      toast.error('Lỗi tải lịch sử')
    } finally {
      setIsLoadingHistory(false)
    }
  }, [getPatientHistory])

  // Handle patient registration
  const handleRegisterPatient = useCallback(async (patientData: any) => {
    if (!registerPatient) return

    setIsRegistering(true)
    try {
      const patientId = await registerPatient(patientData)
      toast.success(`Đã đăng ký bệnh nhân: ${patientId}`)

      // Auto-select the newly registered patient
      const newPatient: Patient = {
        id: patientId,
        patientId: patientId,
        ...patientData,
      }

      setSelectedPatient(newPatient)
      setShowRegistrationDialog(false)
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Đăng ký bệnh nhân thất bại')
    } finally {
      setIsRegistering(false)
    }
  }, [registerPatient])

  // Handle patient update
  const handleUpdatePatient = useCallback(async (patient: Patient) => {
    if (!updatePatient) {
      toast.info('Chức năng cập nhật chưa được cấu hình')
      return
    }

    try {
      const success = await updatePatient(patient.id, patient)
      if (success) {
        setSelectedPatient(patient)
        toast.success('Cập nhật thông tin thành công')
      } else {
        toast.error('Cập nhật thất bại')
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Lỗi cập nhật bệnh nhân')
    }
  }, [updatePatient])

  // Handle patient deletion
  const handleDeletePatient = useCallback(async (patientId: string) => {
    if (!deletePatient) {
      toast.info('Chức năng xóa chưa được cấu hình')
      return false
    }

    try {
      const success = await deletePatient(patientId)
      if (success) {
        setSelectedPatient(null)
        setPatientHistory([])
        toast.success('Đã xóa bệnh nhân')
      }
      return success
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Lỗi xóa bệnh nhân')
      return false
    }
  }, [deletePatient])

  // Subscribe to real-time history updates
  useEffect(() => {
    if (!selectedPatient || !subscribeToHistory) return

    const unsubscribe = subscribeToHistory(selectedPatient.patientId, (history) => {
      setPatientHistory(history)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [selectedPatient, subscribeToHistory])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Quản lý bệnh nhân</h1>
          <p className="text-muted-foreground mt-1">
            Tìm kiếm, đăng ký và theo dõi lịch sử truyền dịch
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

      {/* Patient Search */}
      <Card className="medical-card">
        <CardHeader>
          <CardTitle className="text-white">Tìm kiếm bệnh nhân</CardTitle>
        </CardHeader>
        <CardContent>
          <PatientSearchBar
            onPatientSelect={handlePatientSelect}
            onRegisterNew={() => setShowRegistrationDialog(true)}
            searchFunction={searchPatients}
            placeholder="Nhập mã bệnh nhân hoặc tên để tìm kiếm..."
          />
        </CardContent>
      </Card>

      {/* Patient Details & History */}
      {selectedPatient ? (
        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Thông tin bệnh nhân</TabsTrigger>
            <TabsTrigger value="history">
              Lịch sử truyền dịch
              {patientHistory.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                  {patientHistory.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Patient Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <PatientInfoCard
              patient={selectedPatient}
              onEdit={handleUpdatePatient}
              onDelete={handleDeletePatient}
              showActions
            />
          </TabsContent>

          {/* Pump History Tab */}
          <TabsContent value="history" className="space-y-4">
            {historyError && (
              <Alert variant="destructive">
                <AlertDescription>{historyError}</AlertDescription>
              </Alert>
            )}

            {isLoadingHistory ? (
              <Card className="medical-card">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-muted-foreground">Đang tải lịch sử...</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <PumpHistoryTable
                data={patientHistory}
                isLoading={isLoadingHistory}
                onRowClick={(entry) => {
                  console.log('Clicked entry:', entry)
                  toast.info('Chi tiết bản ghi: ' + entry.id)
                }}
                onPatientClick={(patientId) => {
                  console.log('Clicked patient:', patientId)
                }}
                showFilters
                showExport
                realTime={!!subscribeToHistory}
              />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        /* Empty State */
        <Card className="medical-card">
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Chưa chọn bệnh nhân
              </h3>
              <p className="text-muted-foreground mb-4">
                Tìm kiếm bệnh nhân hoặc đăng ký bệnh nhân mới để bắt đầu
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => setShowRegistrationDialog(true)}
                  className="medical-button"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Đăng ký mới
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patient Registration Dialog */}
      <PatientRegistrationDialog
        isOpen={showRegistrationDialog}
        onClose={() => setShowRegistrationDialog(false)}
        onSuccess={handleRegisterPatient}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE EXAMPLE - Firebase Integration
// ═══════════════════════════════════════════════════════════════════════════
/*
// In your page component:
import { PatientDashboardExample } from '@/components/patients/patient-dashboard-example'
import { collection, query, where, getDocs, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { getFirestoreDB } from '@/lib/firebase'

function PatientManagementPage() {
  const db = getFirestoreDB()

  const searchPatients = async (query: string) => {
    const q = query(
      collection(db, 'patients'),
      where('patientId', '>=', query),
      where('patientId', '<=', query + '')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }

  const registerPatient = async (patientData: any) => {
    const docRef = await addDoc(collection(db, 'patients'), patientData)
    return docRef.id
  }

  const getPatientHistory = async (patientId: string) => {
    const q = query(
      collection(db, 'pump_history'),
      where('patientId', '==', patientId),
      orderBy('timestamp', 'desc'),
      limit(50)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }

  const subscribeToHistory = (patientId: string, callback: (data: any[]) => void) => {
    const q = query(
      collection(db, 'pump_history'),
      where('patientId', '==', patientId),
      orderBy('timestamp', 'desc'),
      limit(50)
    )
    return onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      callback(history)
    })
  }

  const updatePatient = async (patientId: string, data: any) => {
    await updateDoc(doc(db, 'patients', patientId), data)
    return true
  }

  const deletePatient = async (patientId: string) => {
    await deleteDoc(doc(db, 'patients', patientId))
    return true
  }

  return (
    <PatientDashboardExample
      searchPatients={searchPatients}
      registerPatient={registerPatient}
      getPatientHistory={getPatientHistory}
      subscribeToHistory={subscribeToHistory}
      updatePatient={updatePatient}
      deletePatient={deletePatient}
    />
  )
}
*/
