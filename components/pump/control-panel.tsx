'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, Home, ArrowLeft, Bell, RotateCcw, AlertTriangle, ChevronRight, Clock } from 'lucide-react'
import type { PumpStatus, HistoryEntry } from '@/lib/pump-types'
import { 
  SYRINGE_SPECS, 
  calculateProgress, 
  calculateInfusedVolume 
} from '@/lib/pump-types'

interface ControlPanelProps {
  status: PumpStatus
  history: HistoryEntry[]
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onRehome: () => void
  onResetAlarm: () => void
  onBack: () => void
}

export function ControlPanel({ 
  status, 
  history,
  onStart,
  onPause,
  onResume,
  onStop,
  onRehome,
  onResetAlarm,
  onBack
}: ControlPanelProps) {
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
  const progress = calculateProgress(status.steps_completed, status.steps_total)
  const infusedVolume = calculateInfusedVolume(
    status.steps_completed, 
    status.steps_total, 
    status.volume_ml
  )

  // Determine which action button to show
  // CRITICAL: canStart requires contact_found - user MUST run Prepare first
  const canStart = status.state === 'READY' && status.contact_found && !status.pump_running
  const canPause = status.pump_running && !status.paused
  const canResume = status.paused

  const latestEvent = status.fsr_alert 
    ? 'Phat hien ap luc cao'
    : !status.contact_found
      ? 'Chua nhan dien ong'
      : 'He thong san sang'

  return (
    <div className="medical-panel p-4">
      {/* Syringe Type Header */}
      <div className="syringe-header mb-4">
        <span className="text-sm text-muted-foreground">Ong </span>
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

        {/* Infused Volume with Progress */}
        <div className="param-row flex-col items-stretch gap-3">
          <div className="flex justify-between items-center">
            <span className="param-label">Đã truyền</span>
            <div className="flex items-baseline">
              <span className="value-medium">{(infusedVolume ?? 0).toFixed(1)}</span>
              <span className="value-unit">ml</span>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <div className="progress-track flex-1">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-mono text-primary min-w-[3rem] text-right">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Control Buttons - Three buttons in a row */}
      <div className="flex gap-2 mb-4">
        {/* Start/Pause/Resume Button */}
        {canStart && (
          <button onClick={onStart} className="btn-control btn-primary flex-1">
            <Play className="h-4 w-4" />
            Bat dau
          </button>
        )}
        {canPause && (
          <button onClick={onPause} className="btn-control btn-secondary flex-1">
            <Pause className="h-4 w-4" />
            Tam dung
          </button>
        )}
        {canResume && (
          <button onClick={onResume} className="btn-control btn-primary flex-1">
            <Play className="h-4 w-4" />
            Tiep tuc
          </button>
        )}
        {!canStart && !canPause && !canResume && (
          <button className="btn-control btn-primary flex-1 opacity-50" disabled>
            <Play className="h-4 w-4" />
            Bat dau
          </button>
        )}
        
        {/* Home Button */}
        <button onClick={onRehome} className="btn-control btn-secondary flex-1">
          <Home className="h-4 w-4" />
          Home
        </button>
        
        {/* Back Button */}
        <button onClick={onBack} className="btn-control btn-secondary flex-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      {/* System Actions */}
      <div className="mb-4">
        <div className="text-sm text-muted-foreground mb-2">Thao tac he thong</div>
        
        <button 
          className="action-row w-full"
          onClick={onResetAlarm}
        >
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-warning" />
            <span className="text-sm text-white">Xac nhan bao dong</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        <button 
          className="action-row w-full"
          onClick={onRehome}
        >
          <div className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-primary" />
            <span className="text-sm text-white">Ve home</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Recent Events */}
      <div>
        <div className="text-sm text-muted-foreground mb-2">Su kien gan nhat</div>
        <div className="event-item">
          <AlertTriangle className={`h-4 w-4 shrink-0 ${status.fsr_alert ? 'text-destructive' : 'text-warning'}`} />
          <span className="flex-1 text-sm text-white truncate">{latestEvent}</span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span suppressHydrationWarning>{currentTime.slice(0, 5)} AM</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Last Update Footer */}
      <div className="mt-4 flex justify-between text-xs text-muted-foreground border-t border-border/30 pt-3">
        <span suppressHydrationWarning>Cap nhat: {currentTime}</span>
        <span suppressHydrationWarning>Cap nhat: {currentTime}</span>
      </div>
    </div>
  )
}
