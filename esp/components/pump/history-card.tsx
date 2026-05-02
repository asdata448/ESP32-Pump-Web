'use client'

import { History, Clock, Droplets, Gauge, Syringe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { HistoryEntry } from '@/lib/pump-types'
import { formatTime } from '@/lib/pump-types'

interface HistoryCardProps {
  history: HistoryEntry[]
}

export function HistoryCard({ history }: HistoryCardProps) {
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Lich su (5 lan gan nhat)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Chua co lich su bom
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Lich su (5 lan gan nhat)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.slice(0, 5).map((entry, index) => (
            <div 
              key={index}
              className="rounded-lg bg-muted p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Lan {index + 1}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Syringe className="h-3 w-3" />
                  {entry.syringe}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Gauge className="h-3 w-3" />
                  <span>{entry.speed_mlh} ml/h</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Droplets className="h-3 w-3" />
                  <span>{entry.volume_ml} ml</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(entry.total_sec)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
