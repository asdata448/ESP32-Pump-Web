'use client'

import { TrendingUp, Clock, Droplets, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { PumpStatus } from '@/lib/pump-types'
import { formatTime, calculateProgress, calculateInfusedVolume } from '@/lib/pump-types'

interface ProgressCardProps {
  status: PumpStatus
}

export function ProgressCard({ status }: ProgressCardProps) {
  const progress = calculateProgress(status.steps_completed, status.steps_total)
  const infusedVolume = calculateInfusedVolume(
    status.steps_completed, 
    status.steps_total, 
    status.volume_ml
  )
  const remainingTime = formatTime(status.remaining_sec)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          Tien trinh
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Hoan thanh</span>
            <span className="font-mono font-bold text-2xl text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-4" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Infused Volume */}
          <div className="rounded-lg bg-muted p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Droplets className="h-4 w-4" />
              <span className="text-xs">Da bom</span>
            </div>
            <p className="font-mono text-xl font-bold">
              {infusedVolume}
              <span className="text-sm font-normal text-muted-foreground"> / {status.volume_ml} ml</span>
            </p>
          </div>

          {/* Remaining Time */}
          <div className="rounded-lg bg-muted p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Con lai</span>
            </div>
            <p className="font-mono text-xl font-bold">
              {remainingTime}
            </p>
          </div>
        </div>

        {/* Step Counter */}
        <div className="flex items-center justify-between rounded-lg bg-muted p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span className="text-sm">So buoc</span>
          </div>
          <p className="font-mono text-sm">
            <span className="font-bold">{status.steps_completed.toLocaleString()}</span>
            <span className="text-muted-foreground"> / {status.steps_total.toLocaleString()}</span>
          </p>
        </div>

        {/* Speed Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Toc do hien tai</span>
          <span className="font-mono font-medium">{status.speed_mlh} ml/h</span>
        </div>

        {/* Syringe Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Ong tiem</span>
          <span className="font-medium">{status.syringe}</span>
        </div>
      </CardContent>
    </Card>
  )
}
