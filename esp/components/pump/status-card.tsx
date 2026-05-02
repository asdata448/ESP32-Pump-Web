'use client'

import { Activity, Home, Hand, AlertTriangle, Play, Pause } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PumpStatus } from '@/lib/pump-types'
import { STATE_LABELS, getStateColor, getStateBgColor } from '@/lib/pump-types'

interface StatusCardProps {
  status: PumpStatus
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
        <span className="text-sm font-medium">{value ? 'Co' : 'Khong'}</span>
      </div>
    </div>
  )
}

export function StatusCard({ status }: StatusCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Trang thai he thong
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Current State */}
        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-sm">Trang thai hien tai</span>
          <span className={`px-2 py-1 rounded text-sm font-medium ${getStateBgColor(status.state)} ${getStateColor(status.state)}`}>
            {STATE_LABELS[status.state]}
          </span>
        </div>

        <StatusItem 
          label="Da ve home" 
          value={status.homed} 
          icon={Home}
        />
        
        <StatusItem 
          label="Da tiep xuc ong tiem" 
          value={status.contact_found} 
          icon={Hand}
        />
        
        <StatusItem 
          label="Canh bao FSR" 
          value={status.fsr_alert} 
          icon={AlertTriangle}
          activeColor="text-destructive"
        />
        
        <StatusItem 
          label="Bom dang chay" 
          value={status.pump_running} 
          icon={Play}
          activeColor="text-primary"
        />
        
        <StatusItem 
          label="Da tam dung" 
          value={status.paused} 
          icon={Pause}
          activeColor="text-warning-foreground"
        />
      </CardContent>
    </Card>
  )
}
