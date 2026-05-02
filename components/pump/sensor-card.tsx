'use client'

import { Cpu, Radio, ToggleLeft, Volume2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { PumpStatus } from '@/lib/pump-types'

interface SensorCardProps {
  status: PumpStatus
}

export function SensorCard({ status }: SensorCardProps) {
  // Calculate FSR percentage relative to occlusion threshold
  const fsrPercentage = Math.min(100, (status.fsr_raw / status.fsr_occlusion_threshold) * 100)
  const isPresent = status.fsr_raw > status.fsr_presence_threshold
  const isOcclusion = status.fsr_raw > status.fsr_occlusion_threshold

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Cpu className="h-5 w-5" />
          Bang cam bien
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* FSR Value */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Gia tri FSR</span>
            <span className={`font-mono font-bold ${
              isOcclusion ? 'text-destructive' : isPresent ? 'text-success' : 'text-muted-foreground'
            }`}>
              {status.fsr_raw}
            </span>
          </div>
          <Progress 
            value={fsrPercentage} 
            className={`h-2 ${isOcclusion ? '[&>div]:bg-destructive' : isPresent ? '[&>div]:bg-success' : ''}`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span className="text-warning-foreground">Tiep xuc: {status.fsr_presence_threshold}</span>
            <span className="text-destructive">Nghen: {status.fsr_occlusion_threshold}</span>
          </div>
        </div>

        {/* Threshold Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground mb-1">Nguong tiep xuc</p>
            <p className="font-mono font-bold">{status.fsr_presence_threshold}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground mb-1">Nguong nghen</p>
            <p className="font-mono font-bold">{status.fsr_occlusion_threshold}</p>
          </div>
        </div>

        {/* Limit Switch */}
        <div className="flex items-center justify-between py-2 border-t border-border">
          <div className="flex items-center gap-2">
            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Cong tac hanh trinh</span>
          </div>
          <div className={`flex items-center gap-2 ${status.limit_pressed ? 'text-success' : 'text-muted-foreground'}`}>
            <span className={`h-2 w-2 rounded-full ${status.limit_pressed ? 'bg-success animate-pulse-dot' : 'bg-muted-foreground/30'}`} />
            <span className="text-sm font-medium">{status.limit_pressed ? 'Da nhan' : 'Chua nhan'}</span>
          </div>
        </div>

        {/* Buzzer Status */}
        <div className="flex items-center justify-between py-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Coi bao</span>
          </div>
          <div className={`flex items-center gap-2 ${status.buzzer_on ? 'text-warning-foreground' : 'text-muted-foreground'}`}>
            <span className={`h-2 w-2 rounded-full ${status.buzzer_on ? 'bg-warning animate-pulse-dot' : 'bg-muted-foreground/30'}`} />
            <span className="text-sm font-medium">{status.buzzer_on ? 'Dang keu' : 'Tat'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
