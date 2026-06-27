'use client'

import { useState, useMemo, useCallback } from 'react'
import { format, isWithinInterval, subDays, startOfDay, endOfDay } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Download,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  Eye,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatFirebaseTimestamp, PumpHistoryRecord } from '@/lib/firebase'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type PumpStatus = 'COMPLETED' | 'STOPPED' | 'ERROR' | 'RUNNING'

export interface PumpHistoryEntry extends PumpHistoryRecord {
  patientId?: string
  patientName?: string
  startTime?: Date
  endTime?: Date
}

export type SortField = 'patientId' | 'sessionId' | 'date' | 'startTime' | 'endTime' | 'speed' | 'volume' | 'infusedVolume' | 'status'
export type SortOrder = 'asc' | 'desc'

export interface HistoryFilters {
  dateRange?: { from: Date; to: Date }
  status?: PumpStatus[]
  patientQuery?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// PROPS
//════════════════════════════════════════════════════════════════════════════

interface PumpHistoryTableProps {
  data: PumpHistoryEntry[]
  isLoading?: boolean
  onRowClick?: (entry: PumpHistoryEntry) => void
  onPatientClick?: (patientId: string) => void
  className?: string
  pageSize?: number
  showFilters?: boolean
  showExport?: boolean
  realTime?: boolean
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<
  PumpStatus,
  { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }
> = {
  COMPLETED: {
    label: 'Hoàn thành',
    color: 'text-success',
    bgColor: 'bg-success/10',
    icon: CheckCircle2,
  },
  STOPPED: {
    label: 'Đã dừng',
    color: 'text-warning-foreground',
    bgColor: 'bg-warning/10',
    icon: Clock,
  },
  ERROR: {
    label: 'Lỗi',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    icon: XCircle,
  },
  RUNNING: {
    label: 'Đang chạy',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    icon: AlertCircle,
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// PUMP HISTORY TABLE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PumpHistoryTable({
  data,
  isLoading = false,
  onRowClick,
  onPatientClick,
  className,
  pageSize = 10,
  showFilters = true,
  showExport = true,
  realTime = false,
}: PumpHistoryTableProps) {
  // State
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedStatuses, setSelectedStatuses] = useState<PumpStatus[]>([])
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [patientQuery, setPatientQuery] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'patientId',
    'sessionId',
    'date',
    'startTime',
    'endTime',
    'speed',
    'volume',
    'infusedVolume',
    'status',
  ])

  // Column definitions
  const columns = [
    { id: 'patientId', label: 'Mã bệnh nhân', sortable: true },
    { id: 'sessionId', label: 'Mã bơm', sortable: true },
    { id: 'date', label: 'Ngày truyền', sortable: true },
    { id: 'startTime', label: 'Giờ bắt đầu', sortable: true },
    { id: 'endTime', label: 'Giờ kết thúc', sortable: true },
    { id: 'speed', label: 'Tốc độ (ml/h)', sortable: true },
    { id: 'volume', label: 'Thể tích cài (ml)', sortable: true },
    { id: 'infusedVolume', label: 'Thể tích đã bơm (ml)', sortable: true },
    { id: 'status', label: 'Trạng thái', sortable: true },
  ]

  // Filter and sort data
  const filteredData = useMemo(() => {
    return data.filter((entry) => {
      // Status filter
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(entry.status as PumpStatus)) {
        return false
      }

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const entryDate = entry.timestamp instanceof Date
          ? entry.timestamp
          : new Date(entry.timestamp)

        if (dateRange.from && entryDate < startOfDay(dateRange.from)) {
          return false
        }
        if (dateRange.to && entryDate > endOfDay(dateRange.to)) {
          return false
        }
      }

      // Patient query filter
      if (patientQuery) {
        const query = patientQuery.toLowerCase()
        const patientId = entry.patientId || entry.deviceId || ''
        const patientName = entry.patientName || ''
        if (!patientId.toLowerCase().includes(query) && !patientName.toLowerCase().includes(query)) {
          return false
        }
      }

      return true
    })
  }, [data, selectedStatuses, dateRange, patientQuery])

  // Sort data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'patientId':
          comparison = (a.patientId || a.deviceId || '').localeCompare(b.patientId || b.deviceId || '')
          break
        case 'sessionId':
          comparison = (a.id || '').localeCompare(b.id || '')
          break
        case 'date':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          break
        case 'startTime':
          comparison = new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime()
          break
        case 'endTime':
          comparison = new Date(a.endTime || 0).getTime() - new Date(b.endTime || 0).getTime()
          break
        case 'speed':
          comparison = a.speedMlh - b.speedMlh
          break
        case 'volume':
          comparison = a.volumeMl - b.volumeMl
          break
        case 'infusedVolume':
          comparison = a.infusedVolumeMl - b.infusedVolumeMl
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [filteredData, sortField, sortOrder])

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (sortedData.length === 0) {
      toast.error('Không có dữ liệu để xuất')
      return
    }

    const headers = columns
      .filter(col => visibleColumns.includes(col.id))
      .map(col => col.label)
      .join(',')

    const rows = sortedData.map(entry => {
      return columns
        .filter(col => visibleColumns.includes(col.id))
        .map(col => {
          switch (col.id) {
            case 'patientId':
              return entry.patientId || entry.deviceId || ''
            case 'sessionId':
              return entry.id || ''
            case 'date':
              return format(new Date(entry.timestamp), 'dd/MM/yyyy', { locale: vi })
            case 'startTime':
              return entry.startTime ? format(new Date(entry.startTime), 'HH:mm') : ''
            case 'endTime':
              return entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : ''
            case 'speed':
              return entry.speedMlh.toString()
            case 'volume':
              return entry.volumeMl.toString()
            case 'infusedVolume':
              return entry.infusedVolumeMl.toFixed(2)
            case 'status':
              return STATUS_CONFIG[entry.status as PumpStatus]?.label || entry.status
            default:
              return ''
          }
        })
        .join(',')
    })

    const csv = [headers, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `pump-history-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Đã xuất dữ liệu thành công')
  }, [sortedData, columns, visibleColumns])

  // Quick date filters
  const quickDateFilters = [
    { label: 'Hôm nay', days: 0 },
    { label: '7 ngày', days: 7 },
    { label: '30 ngày', days: 30 },
    { label: '90 ngày', days: 90 },
  ]

  const setQuickDateFilter = (days: number) => {
    const to = new Date()
    const from = days === 0 ? new Date() : subDays(to, days)
    setDateRange({ from, to })
  }

  // Format time
  const formatTime = (date: Date | string | number): string => {
    try {
      const d = new Date(date)
      return format(d, 'HH:mm')
    } catch {
      return '-'
    }
  }

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    )
  }

  return (
    <Card className={cn('medical-card overflow-hidden', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            Lịch sử truyền dịch
            {realTime && (
              <Badge variant="outline" className="text-xs border-primary text-primary animate-pulse">
                Live
              </Badge>
            )}
          </CardTitle>

          {showExport && (
            <Button
              onClick={exportToCSV}
              disabled={sortedData.length === 0 || isLoading}
              className="medical-button"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Xuất CSV
            </Button>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm bệnh nhân..."
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
                className="medical-input pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={selectedStatuses.length === 0 ? 'all' : selectedStatuses[0]}
              onValueChange={(value) => {
                if (value === 'all') {
                  setSelectedStatuses([])
                } else {
                  setSelectedStatuses([value as PumpStatus])
                }
              }}
            >
              <SelectTrigger className="medical-input w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="medical-button-outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  {dateRange.from
                    ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${dateRange.to ? format(dateRange.to, 'dd/MM/yyyy') : '...'}`
                    : 'Chọn ngày'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 medical-card" align="start">
                <CalendarComponent
                  mode="range"
                  selected={dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                  className="medical-calendar"
                />
              </PopoverContent>
            </Popover>

            {/* Quick Date Filters */}
            <div className="flex gap-1">
              {quickDateFilters.map((filter) => (
                <Button
                  key={filter.label}
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuickDateFilter(filter.days)}
                  className="text-xs"
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {/* Clear Filters */}
            {(selectedStatuses.length > 0 || dateRange.from || patientQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedStatuses([])
                  setDateRange({})
                  setPatientQuery('')
                }}
                className="text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Xóa bộ lọc
              </Button>
            )}

            {/* Column Visibility */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="medical-button-outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Cột
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="medical-card">
                {columns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={visibleColumns.includes(col.id)}
                    onCheckedChange={(checked) => {
                      setVisibleColumns(
                        checked
                          ? [...visibleColumns, col.id]
                          : visibleColumns.filter((c) => c !== col.id)
                      )
                    }}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* Results Summary */}
            <div className="flex items-center justify-between mb-4 text-sm">
              <p className="text-muted-foreground">
                Hiển thị {paginatedData.length} / {sortedData.length} bản ghi
              </p>
              {realTime && (
                <div className="flex items-center gap-2 text-success">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-xs">Đang cập nhật real-time</span>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    {columns
                      .filter((col) => visibleColumns.includes(col.id))
                      .map((col) => (
                        <TableHead
                          key={col.id}
                          className={cn(
                            'text-white font-medium',
                            col.sortable && 'cursor-pointer hover:bg-primary/20 transition-colors'
                          )}
                          onClick={() => col.sortable && handleSort(col.id as SortField)}
                        >
                          <div className="flex items-center">
                            {col.label}
                            {col.sortable && renderSortIcon(col.id as SortField)}
                          </div>
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="text-center py-12 text-muted-foreground"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            Đang tải...
                          </div>
                        ) : (
                          <>
                            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Không có dữ liệu</p>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((entry, index) => {
                      const statusConfig = STATUS_CONFIG[entry.status as PumpStatus] || STATUS_CONFIG.COMPLETED
                      const StatusIcon = statusConfig.icon

                      return (
                        <AnimatePresence key={entry.id || index}>
                          <motion.tr
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                              'hover:bg-primary/10 transition-colors cursor-pointer',
                              onRowClick && 'cursor-pointer'
                            )}
                            onClick={() => onRowClick?.(entry)}
                          >
                            {visibleColumns.includes('patientId') && (
                              <TableCell
                                className="font-medium"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onPatientClick?.(entry.patientId || entry.deviceId || '')
                                }}
                              >
                                <Button
                                  variant="link"
                                  className="p-0 h-auto font-mono text-sm text-primary hover:text-primary/80"
                                >
                                  {entry.patientId || entry.deviceId || '-'}
                                </Button>
                              </TableCell>
                            )}
                            {visibleColumns.includes('sessionId') && (
                              <TableCell className="font-mono text-xs">
                                {entry.id?.split('-')[1]?.slice(0, 8) || '-'}
                              </TableCell>
                            )}
                            {visibleColumns.includes('date') && (
                              <TableCell>
                                {format(new Date(entry.timestamp), 'dd/MM/yyyy', { locale: vi })}
                              </TableCell>
                            )}
                            {visibleColumns.includes('startTime') && (
                              <TableCell className="text-muted-foreground">
                                {entry.startTime ? formatTime(entry.startTime) : '-'}
                              </TableCell>
                            )}
                            {visibleColumns.includes('endTime') && (
                              <TableCell className="text-muted-foreground">
                                {entry.endTime ? formatTime(entry.endTime) : '-'}
                              </TableCell>
                            )}
                            {visibleColumns.includes('speed') && (
                              <TableCell className="text-right">
                                {entry.speedMlh.toFixed(1)}
                              </TableCell>
                            )}
                            {visibleColumns.includes('volume') && (
                              <TableCell className="text-right">
                                {entry.volumeMl.toFixed(1)}
                              </TableCell>
                            )}
                            {visibleColumns.includes('infusedVolume') && (
                              <TableCell className="text-right">
                                {entry.infusedVolumeMl.toFixed(2)}
                              </TableCell>
                            )}
                            {visibleColumns.includes('status') && (
                              <TableCell>
                                <Badge className={cn(statusConfig.bgColor, statusConfig.color)}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                              </TableCell>
                            )}
                          </motion.tr>
                        </AnimatePresence>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Trang {currentPage} / {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="medical-button-outline"
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="medical-button-outline"
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
