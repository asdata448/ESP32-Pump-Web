'use client'

import { useState } from 'react'
import { 
  Gamepad2, 
  PlayCircle, 
  PauseCircle, 
  StopCircle, 
  RotateCcw, 
  Home, 
  AlertTriangle,
  Loader2 
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { PumpStatus } from '@/lib/pump-types'

interface ControlsCardProps {
  status: PumpStatus
  onPrepare: () => Promise<void>
  onStart: () => Promise<void>
  onPause: () => Promise<void>
  onResume: () => Promise<void>
  onStop: () => Promise<void>
  onRehome: () => Promise<void>
  onResetAlarm: () => Promise<void>
}

type ActionType = 'prepare' | 'start' | 'pause' | 'resume' | 'stop' | 'rehome' | 'resetAlarm' | null

export function ControlsCard({
  status,
  onPrepare,
  onStart,
  onPause,
  onResume,
  onStop,
  onRehome,
  onResetAlarm,
}: ControlsCardProps) {
  const [loading, setLoading] = useState<ActionType>(null)

  const handleAction = async (action: ActionType, fn: () => Promise<void>) => {
    setLoading(action)
    try {
      await fn()
    } finally {
      setLoading(null)
    }
  }

  const { state, pump_running, paused, homed, contact_found, fsr_alert } = status

  // Button states
  const canPrepare = homed && !pump_running && (state === 'MAIN' || state === 'SETUP' || state === 'SYRINGE')
  const canStart = (state === 'READY' || state === 'PREPARE') && contact_found && !pump_running
  const canPause = pump_running && !paused
  const canResume = pump_running && paused
  const canStop = pump_running || state === 'READY' || state === 'PREPARE' || state === 'RESULT'
  const canRehome = !pump_running
  const canResetAlarm = state === 'ERROR' || fsr_alert

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gamepad2 className="h-5 w-5" />
          Điều khiển thủ công
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {/* Prepare */}
          <Button
            variant="outline"
            onClick={() => handleAction('prepare', onPrepare)}
            disabled={!canPrepare || loading !== null}
            className="h-auto py-3 flex-col gap-1"
          >
            {loading === 'prepare' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RotateCcw className="h-5 w-5" />
            )}
            <span className="text-xs">Chuẩn bị</span>
          </Button>

          {/* Start */}
          <Button
            onClick={() => handleAction('start', onStart)}
            disabled={!canStart || loading !== null}
            className="h-auto py-3 flex-col gap-1 bg-success hover:bg-success/90 text-success-foreground"
          >
            {loading === 'start' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <PlayCircle className="h-5 w-5" />
            )}
            <span className="text-xs">Bắt đầu</span>
          </Button>

          {/* Pause */}
          <Button
            variant="outline"
            onClick={() => handleAction('pause', onPause)}
            disabled={!canPause || loading !== null}
            className="h-auto py-3 flex-col gap-1 border-warning text-warning-foreground hover:bg-warning/10"
          >
            {loading === 'pause' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <PauseCircle className="h-5 w-5" />
            )}
            <span className="text-xs">Tạm dừng</span>
          </Button>

          {/* Resume */}
          <Button
            variant="outline"
            onClick={() => handleAction('resume', onResume)}
            disabled={!canResume || loading !== null}
            className="h-auto py-3 flex-col gap-1 border-primary text-primary hover:bg-primary/10"
          >
            {loading === 'resume' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <PlayCircle className="h-5 w-5" />
            )}
            <span className="text-xs">Tiếp tục</span>
          </Button>

          {/* Stop */}
          <Button
            variant="destructive"
            onClick={() => handleAction('stop', onStop)}
            disabled={!canStop || loading !== null}
            className="h-auto py-3 flex-col gap-1"
          >
            {loading === 'stop' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <StopCircle className="h-5 w-5" />
            )}
            <span className="text-xs">Dừng</span>
          </Button>

          {/* Re-home */}
          <Button
            variant="outline"
            onClick={() => handleAction('rehome', onRehome)}
            disabled={!canRehome || loading !== null}
            className="h-auto py-3 flex-col gap-1"
          >
            {loading === 'rehome' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Home className="h-5 w-5" />
            )}
            <span className="text-xs">Về Home</span>
          </Button>
        </div>

        {/* Reset Alarm - Full width */}
        {(state === 'ERROR' || fsr_alert) && (
          <Button
            variant="destructive"
            onClick={() => handleAction('resetAlarm', onResetAlarm)}
            disabled={!canResetAlarm || loading !== null}
            className="w-full mt-3"
          >
            {loading === 'resetAlarm' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="mr-2 h-4 w-4" />
            )}
            Xóa cảnh báo
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
