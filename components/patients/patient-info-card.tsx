'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  User,
  Calendar,
  Weight,
  Edit,
  Trash2,
  Copy,
  Check,
  X,
  Clock,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Patient {
  id: string
  patientId: string
  fullName: string
  dateOfBirth: string // YYYY-MM-DD (canonical)
  gender: 'MALE' | 'FEMALE' // canonical
  weight: number
  createdAt?: string
  updatedAt?: string
  notes?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// PROPS
//════════════════════════════════════════════════════════════════════════════

interface PatientInfoCardProps {
  patient: Patient
  onEdit?: (patient: Patient) => void
  onDelete?: (patientId: string) => Promise<boolean>
  className?: string
  showActions?: boolean
  compact?: boolean
  variant?: 'default' | 'outline' | 'ghost'
}

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT INFO CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PatientInfoCard({
  patient,
  onEdit,
  onDelete,
  className,
  showActions = true,
  compact = false,
  variant = 'default',
}: PatientInfoCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  // Calculate age from date of birth (accepts YYYY-MM-DD string)
  const calculateAge = (dateOfBirth: string): number => {
    const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--
    }
    return age
  }

  // Copy patient ID to clipboard
  const copyPatientId = async () => {
    try {
      await navigator.clipboard.writeText(patient.patientId)
      setCopied(true)
      toast.success('Đã sao chép mã bệnh nhân')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('Không thể sao chép mã bệnh nhân')
    }
  }

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!onDelete) return

    setIsDeleting(true)
    try {
      const success = await onDelete(patient.id)
      if (success) {
        toast.success('Đã xóa bệnh nhân thành công')
        setShowDeleteDialog(false)
      } else {
        toast.error('Xóa bệnh nhân thất bại')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Lỗi khi xóa bệnh nhân')
    } finally {
      setIsDeleting(false)
    }
  }

  // Format dates (accepts YYYY-MM-DD string or ISO string)
  const formatDate = (date: string): string => {
    try {
      const parsed = typeof date === 'string' ? parseISO(date) : new Date(date as any)
      return format(parsed, 'dd/MM/yyyy', { locale: vi })
    } catch {
      return String(date)
    }
  }

  const age = calculateAge(patient.dateOfBirth)

  // Card variants
  const cardStyles = {
    default: 'medical-card',
    outline: 'border border-border bg-background',
    ghost: 'bg-transparent',
  }

  return (
    <>
      <Card className={cn(cardStyles[variant], className, 'overflow-hidden')}>
        {/* Card Header - Patient ID */}
        {!compact && (
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                  {patient.patientId}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyPatientId}
                  className="h-6 w-6 hover:bg-primary/20"
                  title="Sao chép mã bệnh nhân"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {showActions && (
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(patient)}
                      className="h-8 w-8 hover:bg-primary/20"
                      title="Chỉnh sửa"
                    >
                      <Edit className="h-4 w-4 text-primary" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteDialog(true)}
                      className="h-8 w-8 hover:bg-destructive/20"
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
        )}

        {/* Card Content - Patient Details */}
        <CardContent className={cn(compact ? 'p-4' : 'pt-0 pb-4')}>
          {/* Avatar Section (Compact Mode) */}
          {compact && (
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <Badge variant="secondary" className="font-mono text-xs mb-1">
                  {patient.patientId}
                </Badge>
                <h3 className="font-semibold text-white truncate">
                  {patient.fullName}
                </h3>
              </div>
              {showActions && (
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(patient)}
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteDialog(true)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Patient Name */}
          <div className={cn('flex items-center gap-2 mb-4', compact && 'hidden')}>
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">
                {patient.fullName}
              </h3>
            </div>
          </div>

          {/* Patient Details Grid */}
          <div className={cn(
            'grid gap-3',
            compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
          )}>
            {/* Date of Birth & Age */}
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Ngày sinh</p>
                <p className="text-sm text-white">
                  {formatDate(patient.dateOfBirth)}
                  <span className="text-muted-foreground ml-2">
                    ({age} tuổi)
                  </span>
                </p>
              </div>
            </div>

            {/* Gender */}
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Giới tính</p>
                <p className="text-sm text-white">
                  {patient.gender === 'MALE' ? 'Nam' : 'Nữ'}
                </p>
              </div>
            </div>

            {/* Weight */}
            <div className="flex items-start gap-2">
              <Weight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Cân nặng</p>
                <p className="text-sm text-white">{patient.weight} kg</p>
              </div>
            </div>

            {/* Created At */}
            {patient.createdAt && !compact && (
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Ngày đăng ký</p>
                  <p className="text-sm text-white">
                    {formatDate(patient.createdAt)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {patient.notes && !compact && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Ghi chú</p>
              <p className="text-sm text-muted-foreground italic">
                {patient.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="medical-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl">
              Xác nhận xóa bệnh nhân
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Bạn có chắc chắn muốn xóa bệnh nhân &quot;
              <span className="text-white font-semibold">{patient.fullName}</span>
              &quot;?
              <br />
              <br />
              Mã bệnh nhân: <span className="font-mono text-primary">{patient.patientId}</span>
              <br />
              <br />
              <span className="text-destructive font-medium">
                Hành động này không thể hoàn tác!
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="medical-button-outline" disabled={isDeleting}>
                <X className="h-4 w-4 mr-2" />
                Hủy
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={handleDelete}
                className="medical-button bg-destructive hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Xóa bệnh nhân
                  </>
                )}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT INFO CARD - MINIMAL VERSION
// ═══════════════════════════════════════════════════════════════════════════

interface PatientInfoCardMinimalProps {
  patient: Patient
  onClick?: () => void
  className?: string
}

export function PatientInfoCardMinimal({
  patient,
  onClick,
  className,
}: PatientInfoCardMinimalProps) {
  const dob = typeof patient.dateOfBirth === 'string' ? parseISO(patient.dateOfBirth) : new Date(patient.dateOfBirth as any)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'medical-card p-3 rounded-lg cursor-pointer transition-colors hover:bg-primary/10',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-primary" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-white truncate">{patient.fullName}</p>
            <Badge variant="secondary" className="font-mono text-xs shrink-0">
              {patient.patientId}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{age} tuổi</span>
            <span>•</span>
            <span>{patient.gender === 'MALE' ? 'Nam' : 'Nữ'}</span>
            <span>•</span>
            <span>{patient.weight} kg</span>
          </div>
        </div>

        {/* Arrow */}
        {onClick && (
          <div className="shrink-0">
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              →
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
