'use client'

import { Activity, Home, Hand, AlertTriangle, Play, Pause, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PumpStatus } from '@/lib/pump-types'
import { STATE_LABELS, getStateColor, getStateBgColor } from '@/lib/pump-types'
import type { Patient } from '@/components/patients/patient-info-card'

interface StatusCardProps {
  status: PumpStatus
  patient?: Patient | null
}

function StatusItem({ 
  label, 
  value, 
  active, 
  icon: Icon,
  activeColor = 'text-success',
  inactiveColor = 'text-muted-foreground'
}: { 
  label: string
  value: boolean
  active?: boolean
  icon: React.ElementType
  activeColor?: string
  inactiveColor?: string
}) {
  const isActive = active ?? value
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${isActive ? activeColor : inactiveColor}`} />
        <span className="text-sm">{label}</span>
      </div>
      <div className={`flex items-center gap-2 ${isActive ? activeColor : inactiveColor}`}>
        <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-current animate-pulse-dot' : 'bg-muted-foreground/30'}`} />
        <span className="text-sm font-medium">{value ? 'Có' : 'Không'}</span>
      </div>
    </div>
  )
}

export function StatusCard({ status, patient }: StatusCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Trạng thái hệ thống
          </CardTitle>
          {patient && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/30">
              <User className="h-3 w-3 text-primary" />
              <span className="text-xs font-mono text-primary">{patient.patientId}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Current State */}
        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-sm">Trạng thái hiện tại</span>
          <span className={`px-2 py-1 rounded text-sm font-medium ${getStateBgColor(status.state)} ${getStateColor(status.state)}`}>
            {STATE_LABELS[status.state]}
          </span>
        </div>

        <StatusItem
          label="Đã về home"
          value={status.homed}
          icon={Home}
        />

        <StatusItem
          label="Đã tiếp xúc ống tiêm"
          value={status.contact_found}
          icon={Hand}
        />

        <StatusItem
          label="Cảnh báo FSR"
          value={status.fsr_alert}
          icon={AlertTriangle}
          activeColor="text-destructive"
        />

        <StatusItem
          label="Bơm đang chạy"
          value={status.pump_running}
          icon={Play}
          activeColor="text-primary"
        />

        <StatusItem
          label="Đã tạm dừng"
          value={status.paused}
          icon={Pause}
          activeColor="text-warning-foreground"
        />
      </CardContent>
    </Card>
  )
}
