'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { History, Trash2, CheckCircle2, XCircle, AlertTriangle, Clock, Droplets, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DemoHistoryRecord } from '@/lib/demo-types'
import { formatTime } from '@/lib/pump-types'

interface DemoHistoryPanelProps {
  history: DemoHistoryRecord[]
  onClear: () => void
}

export function DemoHistoryPanel({ history, onClear }: DemoHistoryPanelProps) {
  const getStatusConfig = (status: DemoHistoryRecord['status']) => {
    switch (status) {
      case 'COMPLETED':
        return { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', label: 'Hoan thanh' }
      case 'STOPPED':
        return { icon: XCircle, color: 'text-warning-foreground', bg: 'bg-warning/10', label: 'Da dung' }
      case 'ERROR':
        return { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Loi' }
    }
  }

  return (
    <div className="medical-panel p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Lịch sử 5 lần gần nhất</span>
        </div>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Xoa
          </Button>
        )}
      </div>

      {/* History List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {history.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground text-sm"
            >
              Chưa có lịch sử bơm
            </motion.div>
          ) : (
            history.map((record, index) => {
              const statusConfig = getStatusConfig(record.status)
              const StatusIcon = statusConfig.icon

              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="medical-panel-inner rounded-lg p-3"
                >
                  {/* Top row - Status and time */}
                  <div className="flex items-center justify-between mb-2">
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color} ${statusConfig.bg}`}>
                      <StatusIcon className="h-3 w-3" />
                      <span>{statusConfig.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {record.formattedTime}
                    </span>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">{record.syringeType}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Gauge className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">{record.speedMlh ?? 0}</span>
                      <span className="text-muted-foreground">ml/h</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Droplets className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">{(record.infusedVolumeMl ?? 0).toFixed(1)}</span>
                      <span className="text-muted-foreground">/{record.volumeMl ?? 0}ml</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="progress-track h-1.5">
                      <div
                        className={`h-full rounded transition-all ${
                          record.status === 'COMPLETED'
                            ? 'bg-success'
                            : record.status === 'ERROR'
                            ? 'bg-destructive'
                            : 'bg-warning'
                        }`}
                        style={{ width: `${(record.stepsCompleted / record.stepsTotal) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Thoi gian: {formatTime(record.totalTimeSec)}</span>
                  </div>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
