'use client'

import { AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PumpStatus } from '@/lib/pump-types'

interface AlertBannerProps {
  status: PumpStatus
  onResetAlarm?: () => void
}

type AlertType = 'error' | 'warning' | 'success' | 'info' | null

function getAlertInfo(status: PumpStatus): { type: AlertType; message: string; description?: string } {
  // Error states
  if (status.state === 'ERROR' || status.fsr_alert) {
    return {
      type: 'error',
      message: 'CANH BAO NGHEN',
      description: status.fsr_alert 
        ? `Gia tri FSR: ${status.fsr_raw} vuot nguong ${status.fsr_occlusion_threshold}`
        : 'Da phat hien loi he thong'
    }
  }

  // Paused state
  if (status.paused) {
    return {
      type: 'warning',
      message: 'DA TAM DUNG',
      description: 'Bom dang tam dung. Nhan "Tiep tuc" de tiep tuc bom.'
    }
  }

  // Running state
  if (status.pump_running && !status.paused) {
    return {
      type: 'info',
      message: 'DANG BOM',
      description: `Toc do: ${status.speed_mlh} ml/h - The tich: ${status.volume_ml} ml`
    }
  }

  // Ready state - ONLY show success when contact_found is true
  if (status.state === 'READY' && status.contact_found && status.homed) {
    return {
      type: 'success',
      message: 'SAN SANG',
      description: 'He thong da san sang. Nhan "Bat dau" de bat dau bom.'
    }
  }

  // PREPARE or READY state without contact - warn user to run Prepare
  if ((status.state === 'READY' || status.state === 'PREPARE' || status.state === 'SETUP') && !status.contact_found) {
    return {
      type: 'warning',
      message: 'CHUA CHUAN BI',
      description: 'Vui long nhan "Chuan bi" de he thong ve home va tim piston truoc khi bat dau bom.'
    }
  }

  // Done state
  if (status.state === 'DONE') {
    return {
      type: 'success',
      message: 'HOAN THANH',
      description: 'Qua trinh bom da hoan tat thanh cong.'
    }
  }

  return { type: null, message: '', description: undefined }
}

export function AlertBanner({ status, onResetAlarm }: AlertBannerProps) {
  const { type, message, description } = getAlertInfo(status)

  if (!type) return null

  const styles = {
    error: 'alert-error',
    warning: 'alert-warning',
    success: 'alert-success',
    info: 'alert-info',
  }

  const icons = {
    error: AlertTriangle,
    warning: AlertCircle,
    success: CheckCircle2,
    info: Info,
  }

  const Icon = icons[type]

  return (
    <div className={`alert-banner ${styles[type]}`}>
      <Icon className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">{message}</p>
        {description && (
          <p className="text-sm opacity-90">{description}</p>
        )}
      </div>
      {type === 'error' && onResetAlarm && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onResetAlarm}
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="mr-1 h-4 w-4" />
          Xoa canh bao
        </Button>
      )}
    </div>
  )
}
