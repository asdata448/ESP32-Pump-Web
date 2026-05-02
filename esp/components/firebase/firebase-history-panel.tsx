'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History,
  RefreshCw,
  Trash2,
  Plus,
  Check,
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
  onDeleteSelected?: (ids: string[]) => Promise<number>
  onDeleteAll?: () => Promise<boolean>
  onTestSave?: () => void
  onTestConnection?: () => Promise<{ success: boolean; message: string; details?: any }>
  onSaveRecord?: () => void
  canSaveRecord?: boolean
  deviceId?: string
}

type StatusFilter = 'ALL' | 'COMPLETED' | 'STOPPED' | 'ERROR'

export function FirebaseHistoryPanel({
  history,
  loading,
  error,
  onRefresh,
  onClear,
  onDeleteSelected,
  onDeleteAll,
  onTestSave,
  onTestConnection,
  onSaveRecord,
  canSaveRecord = true,
  deviceId,
}: FirebaseHistoryPanelProps) {
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [saving, setSaving] = useState(false)
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string; details?: any } | null>(null)

  // Filter history - MUST be before handlers that use it
  const filteredHistory = history.filter(record => {
    if (filter === 'ALL') return true
    return record.status === filter
  })

  // Handlers
  const handleSaveRecord = useCallback(async () => {
    if (!onSaveRecord || !canSaveRecord) return
    setSaving(true)
    try {
      await onSaveRecord()
    } finally {
      setSaving(false)
    }
  }, [onSaveRecord, canSaveRecord])

  const handleTestConnection = useCallback(async () => {
    if (!onTestConnection) return
    setTestingConnection(true)
    setConnectionResult(null)
    try {
      const result = await onTestConnection()
      setConnectionResult(result)
      if (result.success) {
        setTimeout(() => setConnectionResult(null), 5000)
      }
    } catch (err) {
      setConnectionResult({
        success: false,
        message: 'Lỗi không xác định',
        details: err,
      })
    } finally {
      setTestingConnection(false)
    }
  }, [onTestConnection])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredHistory.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredHistory.map(r => r.id || '')))
    }
  }, [selectedIds.size, filteredHistory])

  const handleDeleteSelected = useCallback(async () => {
    if (!onDeleteSelected || selectedIds.size === 0) return
    const confirmed = confirm(`Xóa ${selectedIds.size} bản ghi đã chọn?`)
    if (!confirmed) return
    setDeleting(true)
    try {
      await onDeleteSelected(Array.from(selectedIds))
      setSelectedIds(new Set())
      setSelectionMode(false)
    } finally {
      setDeleting(false)
    }
  }, [onDeleteSelected, selectedIds])

  const handleDeleteAll = useCallback(async () => {
    if (!onDeleteAll) return
    const confirmed = confirm(`Xóa TOÀN BỘ ${filteredHistory.length} bản ghi? Hành động này KHÔNG thể hoàn tác!`)
    if (!confirmed) return
    setDeleting(true)
    try {
      await onDeleteAll()
      setSelectedIds(new Set())
    } finally {
      setDeleting(false)
    }
  }, [onDeleteAll, filteredHistory.length])

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

  // Get data source badge
  const getDataSourceBadge = (dataSource: 'demo' | 'real' | undefined) => {
    if (!dataSource) return null
    return (
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
        dataSource === 'demo'
          ? 'bg-purple-500/10 text-purple-400'
          : 'bg-cyan-500/10 text-cyan-400'
      }`}>
        {dataSource === 'demo' ? '🧪 Demo' : '🔴 Thật'}
      </div>
    )
  }

  // Calculate stats
  const stats = {
    total: history.length,
    completed: history.filter(r => r.status === 'COMPLETED').length,
    stopped: history.filter(r => r.status === 'STOPPED').length,
    error: history.filter(r => r.status === 'ERROR').length,
    totalVolume: history.reduce((sum, r) => sum + (r.status === 'COMPLETED' ? (r.infusedVolumeMl ?? 0) : 0), 0),
    // NEW: Stats by data source
    demoCount: history.filter(r => r.dataSource === 'demo').length,
    realCount: history.filter(r => r.dataSource === 'real').length,
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
                <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading} className="h-8 w-8">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              )}
              {onSaveRecord && (
                <Button variant="default" size="sm" onClick={handleSaveRecord} disabled={saving || !canSaveRecord} className="gap-1.5">
                  {saving ? <><RefreshCw className="h-4 w-4 animate-spin" />Đang lưu...</> : <><Download className="h-4 w-4" />Lưu lịch sử</>}
                </Button>
              )}
              {onTestConnection && (
                <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testingConnection} className="gap-1.5">
                  <RefreshCw className={`h-4 w-4 ${testingConnection ? 'animate-spin' : ''}`} />
                  {testingConnection ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                </Button>
              )}
              <Button variant={selectionMode ? 'default' : 'outline'} size="sm" onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()) }} className="gap-1.5">
                {selectionMode ? <><X className="h-4 w-4" />Thoát chọn</> : <><CheckCircle2 className="h-4 w-4" />Chọn để xóa</>}
              </Button>
              {selectionMode && (
                <>
                  <Button variant="outline" size="sm" onClick={toggleSelectAll} className="gap-1.5">
                    {selectedIds.size === filteredHistory.length ? <><XCircle className="h-4 w-4" />Bỏ chọn tất cả</> : <><CheckCircle2 className="h-4 w-4" />Chọn tất cả</>}
                  </Button>
                  {selectedIds.size > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={deleting} className="gap-1.5">
                      {deleting ? <><RefreshCw className="h-4 w-4 animate-spin" />Đang xóa...</> : <><Trash2 className="h-4 w-4" />Xóa {selectedIds.size} đã chọn</>}
                    </Button>
                  )}
                </>
              )}
              {onDeleteAll && (
                <Button variant="destructive" size="sm" onClick={handleDeleteAll} disabled={deleting || filteredHistory.length === 0} className="gap-1.5">
                  {deleting ? <><RefreshCw className="h-4 w-4 animate-spin" />Đang xóa...</> : <><Trash2 className="h-4 w-4" />Xóa tất cả</>}
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

      {/* Connection Test Result */}
      {connectionResult && (
        <Card className={connectionResult.success ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'}>
          <CardContent className="p-4">
            <div className="flex items-start gap-2 text-sm">
              {connectionResult.success ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-success" /> : <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />}
              <div className="flex-1">
                <p className="font-medium">{connectionResult.message}</p>
                {connectionResult.details && (
                  <div className="mt-2 text-xs opacity-80">
                    {connectionResult.details.hint && <p className="mb-1">💡 {connectionResult.details.hint}</p>}
                    {connectionResult.details.code && <p>Mã lỗi: {connectionResult.details.code}</p>}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
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
        {/* NEW: Data source stats */}
        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-400">{stats.demoCount}</div>
            <div className="text-xs text-muted-foreground mt-1">🧪 Demo</div>
          </CardContent>
        </Card>
        <Card className="bg-cyan-500/5 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-cyan-400">{stats.realCount}</div>
            <div className="text-xs text-muted-foreground mt-1">🔴 Thật</div>
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
                    ? 'Chưa có phiên bơm nào được lưu vào Firebase. Hãy bơm và bấm "Lưu lịch sử" để lưu.'
                    : `Không có phiên nào có trạng thái "${filter === 'COMPLETED' ? 'Hoàn thành' : filter === 'STOPPED' ? 'Đã dừng' : 'Lỗi'}"`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredHistory.map((record, index) => {
            const isSelected = selectedIds.has(record.id || '')
            return (
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
                  } ${isSelected ? 'border-primary bg-primary/5' : ''} ${selectionMode ? 'select-none' : ''}`}
                  onClick={() => !selectionMode && setExpandedId(expandedId === record.id ? null : record.id || null)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      {selectionMode && (
                        <div className="flex items-center gap-2 mr-2" onClick={(e) => { e.stopPropagation(); toggleSelection(record.id || '') }}>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground hover:border-primary'}`}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {getStatusBadge(record.status)}
                        {getDataSourceBadge(record.dataSource)}
                        <span className="text-xs text-muted-foreground font-mono">
                          #{record.recordNumber || record.id || '?'}
                        </span>
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
            )
          })}
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
