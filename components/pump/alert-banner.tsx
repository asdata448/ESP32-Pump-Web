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
      message: 'CẢNH BÁO TẮC',
      description: status.fsr_alert
        ? `Giá trị FSR: ${status.fsr_raw} vượt ngưỡng ${status.fsr_occlusion_threshold}`
        : 'Đã phát hiện lỗi hệ thống'
    }
  }

  // Paused state
  if (status.paused) {
    return {
      type: 'warning',
      message: 'ĐÃ TẠM DỪNG',
      description: 'Bơm đang tạm dừng. Nhấn "Tiếp tục" để tiếp tục bơm.'
    }
  }

  // Running state
  if (status.pump_running && !status.paused) {
    return {
      type: 'info',
      message: 'ĐANG BƠM',
      description: `Tốc độ: ${status.speed_mlh} ml/h - Thể tích: ${status.volume_ml} ml`
    }
  }

  // Ready state - ONLY show success when contact_found is true
  if (status.state === 'READY' && status.contact_found && status.homed) {
    return {
      type: 'success',
      message: 'SẴN SÀNG',
      description: 'Hệ thống đã sẵn sàng. Nhấn "Bắt đầu" để bắt đầu bơm.'
    }
  }

  // PREPARE or READY state without contact - warn user to run Prepare
  if ((status.state === 'READY' || status.state === 'PREPARE' || status.state === 'SETUP') && !status.contact_found) {
    return {
      type: 'warning',
      message: 'CHƯA CHUẨN BỊ',
      description: 'Vui lòng nhấn "Chuẩn bị" để hệ thống về home và tìm piston trước khi bắt đầu bơm.'
    }
  }

  // Done state
  if (status.state === 'DONE') {
    return {
      type: 'success',
      message: 'HOÀN THÀNH',
      description: 'Quá trình bơm đã hoàn tất thành công.'
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
          Xóa cảnh báo
        </Button>
      )}
    </div>
  )
}
