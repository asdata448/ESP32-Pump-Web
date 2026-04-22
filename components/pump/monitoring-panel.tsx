'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Clock, Sliders } from 'lucide-react'
import type { PumpStatus, HistoryEntry } from '@/lib/pump-types'
import { 
  SYRINGE_SPECS, 
  formatTime, 
  calculateProgress, 
  calculateInfusedVolume,
  STATE_LABELS
} from '@/lib/pump-types'

interface MonitoringPanelProps {
  status: PumpStatus
  history: HistoryEntry[]
  onControlClick: () => void
}

export function MonitoringPanel({ 
  status, 
  history,
  onControlClick 
}: MonitoringPanelProps) {
  const [currentTime, setCurrentTime] = useState('--:--:--')
  
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const syringeSpec = SYRINGE_SPECS[status.syringe_index] || SYRINGE_SPECS[0]
  const infusedVolume = calculateInfusedVolume(
    status.steps_completed, 
    status.steps_total, 
    status.volume_ml
  )

  // Determine status bar style
  const getStatusBarClass = () => {
    if (status.fsr_alert) return 'status-bar-error'
    if (status.pump_running && !status.paused) return 'status-bar-running'
    if (status.paused) return 'status-bar-paused'
    if (status.state === 'READY' && status.contact_found) return 'status-bar-ready'
    if (!status.contact_found && (status.state === 'READY' || status.state === 'SETUP' || status.state === 'PREPARE')) return 'status-bar-paused'
    return 'status-bar-idle'
  }

  const getStatusText = () => {
    if (status.fsr_alert) return 'CẢNH BÁO TẮC'
    if (status.pump_running && !status.paused) return 'ĐANG TRUYỀN'
    if (status.paused) return 'TẠM DỪNG'
    if (status.state === 'READY' && status.contact_found) return 'SẴN SÀNG'
    if (!status.contact_found && (status.state === 'READY' || status.state === 'SETUP' || status.state === 'PREPARE')) return 'CẦN CHUẨN BỊ'
    return STATE_LABELS[status.state] || status.state
  }

  const latestAlert = status.fsr_alert
    ? 'Phát hiện áp lực cao - Kiểm tra tắc!'
    : !status.contact_found
      ? 'Chưa nhận diện ống - Nhấn "Chuẩn bị"'
      : 'Hệ thống sẵn sàng'

  return (
    <div className="medical-panel p-4">
      {/* Syringe Type Header */}
      <div className="syringe-header mb-4">
        <span className="text-sm text-muted-foreground">Ống: </span>
        <span className="text-sm font-semibold text-white">
          Vinahankook {syringeSpec.name}
        </span>
      </div>

      {/* Parameters Display */}
      <div className="medical-panel-inner mb-4">
        {/* Speed */}
        <div className="param-row">
          <span className="param-label">Tốc độ</span>
          <div className="flex items-baseline">
            <span className="value-large">{(status.speed_mlh ?? 0).toFixed(1)}</span>
            <span className="value-unit">ml/h</span>
          </div>
        </div>

        {/* Volume */}
        <div className="param-row">
          <span className="param-label">Thể tích</span>
          <div className="flex items-baseline">
            <span className="value-large">{status.volume_ml ?? 0}</span>
            <span className="value-unit">ml</span>
          </div>
        </div>

        {/* Infused Volume */}
        <div className="param-row">
          <span className="param-label">Đã truyền</span>
          <div className="flex items-baseline">
            <span className="value-large">{(infusedVolume ?? 0).toFixed(1)}</span>
            <span className="value-unit">ml</span>
          </div>
        </div>

        {/* Time Remaining */}
        <div className="param-row">
          <span className="param-label">Thời gian còn lại</span>
          <div className="flex items-baseline">
            <span className="value-large">{formatTime(status.remaining_sec)}</span>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className={`status-bar ${getStatusBarClass()} mb-4`}>
        {getStatusText()}
      </div>

      {/* Alert Section */}
      <div className="mb-4">
        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Canh bao gan nhat
        </div>
        <div className="alert-box-warning flex items-center gap-3 p-3">
          <AlertTriangle className={`h-5 w-5 shrink-0 ${status.fsr_alert ? 'text-destructive' : 'text-warning'}`} />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-white">{latestAlert}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Clock className="h-3.5 w-3.5" />
            <span suppressHydrationWarning>{currentTime.slice(0, 5)} AM</span>
          </div>
        </div>
      </div>

      {/* Control Button */}
      <button 
        onClick={onControlClick}
        className="btn-control w-full text-base py-3.5"
        style={{
          background: 'linear-gradient(180deg, #ff9944 0%, #ee7722 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 15px rgba(255, 153, 68, 0.3)'
        }}
      >
        <Sliders className="h-5 w-5" />
        Điều khiển
      </button>

      {/* Last Update Footer */}
      <div className="mt-4 flex justify-between text-xs text-muted-foreground border-t border-border/30 pt-3">
        <span suppressHydrationWarning>Cập nhật: {currentTime}</span>
        <span suppressHydrationWarning>Cập nhật: {currentTime}</span>
      </div>
    </div>
  )
}
