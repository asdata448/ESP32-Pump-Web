'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History,
  RefreshCw,
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Clock,
  Droplets,
  Gauge,
  X,
  Filter,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatFirebaseTimestamp, type PumpHistoryRecord } from '@/lib/firebase'

interface FirebaseHistoryPanelProps {
  history: PumpHistoryRecord[]
  loading: boolean
  error: string | null
  onRefresh?: () => void
  onClear?: () => void
  onTestSave?: () => void
  deviceId?: string
}

type StatusFilter = 'ALL' | 'COMPLETED' | 'STOPPED' | 'ERROR'

export function FirebaseHistoryPanel({
  history,
  loading,
  error,
  onRefresh,
  onClear,
  onTestSave,
  deviceId,
}: FirebaseHistoryPanelProps) {
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filter history
  const filteredHistory = history.filter(record => {
    if (filter === 'ALL') return true
    return record.status === filter
  })

  // Get status badge
  const getStatusBadge = (status: PumpHistoryRecord['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Hoàn thành
          </div>
        )
      case 'STOPPED':
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
            <PauseCircle className="h-3 w-3" />
            Đã dừng
          </div>
        )
      case 'ERROR':
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
            <XCircle className="h-3 w-3" />
            Lỗi
          </div>
        )
    }
  }

  // Calculate stats
  const stats = {
    total: history.length,
    completed: history.filter(r => r.status === 'COMPLETED').length,
    stopped: history.filter(r => r.status === 'STOPPED').length,
    error: history.filter(r => r.status === 'ERROR').length,
    totalVolume: history.reduce((sum, r) => sum + (r.status === 'COMPLETED' ? (r.infusedVolumeMl ?? 0) : 0), 0),
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Lịch sử Firebase</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {deviceId ? `Thiết bị: ${deviceId}` : 'Dữ liệu từ Firestore'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onRefresh}
                  disabled={loading}
                  className="h-8 w-8"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              )}
              {onTestSave && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onTestSave}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Test save
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-xs text-muted-foreground mt-1">Tổng phiên</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{stats.completed}</div>
            <div className="text-xs text-muted-foreground mt-1">Hoàn thành</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">{stats.stopped}</div>
            <div className="text-xs text-muted-foreground mt-1">Đã dừng</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{stats.error}</div>
            <div className="text-xs text-muted-foreground mt-1">Lỗi</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-cyan-400">{stats.totalVolume.toFixed(1)}ml</div>
            <div className="text-xs text-muted-foreground mt-1">Tổng thể tích</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1.5 flex-wrap">
              {(['ALL', 'COMPLETED', 'STOPPED', 'ERROR'] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {f === 'ALL' ? 'Tất cả' : f === 'COMPLETED' ? 'Hoàn thành' : f === 'STOPPED' ? 'Đã dừng' : 'Lỗi'}
                </button>
              ))}
            </div>
            {onClear && filteredHistory.length > 0 && (
              <div className="ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClear}
                  className="text-destructive hover:text-destructive h-7"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && filteredHistory.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredHistory.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Chưa có dữ liệu</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {filter === 'ALL'
                    ? 'Chưa có phiên bơm nào được lưu vào Firebase'
                    : `Không có phiên nào có trạng thái "${filter === 'COMPLETED' ? 'Hoàn thành' : filter === 'STOPPED' ? 'Đã dừng' : 'Lỗi'}"`
                  }
                </p>
              </div>
              {onTestSave && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onTestSave}
                  className="mt-2 gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Lưu bản ghi thử
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredHistory.map((record, index) => (
            <motion.div
              key={record.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <Card
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  expandedId === record.id ? 'border-primary' : ''
                }`}
                onClick={() => setExpandedId(expandedId === record.id ? null : record.id || null)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(record.status)}
                        <span className="text-xs text-muted-foreground">
                          {formatFirebaseTimestamp(record.timestamp)}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground text-xs">Ống tiêm</div>
                          <div className="font-medium">{record.syringeType || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Tốc độ</div>
                          <div className="font-medium flex items-center gap-1">
                            <Gauge className="h-3 w-3" />
                            {record.speedMlh ?? 0} ml/h
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Thể tích</div>
                          <div className="font-medium flex items-center gap-1">
                            <Droplets className="h-3 w-3" />
                            {record.volumeMl ?? 0} ml
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Đã truyền</div>
                          <div className="font-medium text-success">
                            {(record.infusedVolumeMl ?? 0).toFixed(1)} ml
                          </div>
                        </div>
                      </div>
                      {record.notes && (
                        <div className="mt-2 text-xs text-muted-foreground italic">
                          Ghi chú: {record.notes}
                        </div>
                      )}
                    </div>
                    <div className={`transition-transform ${expandedId === record.id ? 'rotate-180' : ''}`}>
                      <X className="h-4 w-4 text-muted-foreground rotate-45" />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedId === record.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 mt-4 border-t border-border">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground text-xs mb-1">Thời gian chạy</div>
                              <div className="flex items-center gap-1.5 font-medium">
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                {Math.floor((record.totalTimeSec ?? 0) / 60)}p {((record.totalTimeSec ?? 0) % 60).toFixed(0)}s
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs mb-1">Thiết bị</div>
                              <div className="font-medium text-xs font-mono">
                                {record.deviceIdString || record.deviceId || 'Unknown'}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs mb-1">Tỷ lệ hoàn thành</div>
                              <div className="font-medium">
                                {record.volumeMl > 0
                                  ? (((record.infusedVolumeMl ?? 0) / record.volumeMl) * 100).toFixed(1)
                                  : '0'}%
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs mb-1">Document ID</div>
                              <div className="font-medium text-xs font-mono">
                                {record.id || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {history.length > 0 && (
        <div className="text-center text-xs text-muted-foreground">
          Hiển thị {filteredHistory.length} / {history.length} bản ghi
        </div>
      )}
    </div>
  )
}
