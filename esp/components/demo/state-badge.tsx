'use client'

import { motion } from 'framer-motion'
import type { PumpState } from '@/lib/pump-types'
import { 
  Loader2, 
  Syringe, 
  Home, 
  Settings, 
  PlayCircle, 
  CheckCircle2, 
  AlertTriangle,
  PauseCircle,
  Cog
} from 'lucide-react'

interface StateBadgeProps {
  state: PumpState
  paused?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const stateConfig: Record<PumpState, {
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: React.ElementType
}> = {
  BOOT: {
    label: 'KHỞI ĐỘNG',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    borderColor: 'border-cyan-400/30',
    icon: Loader2,
  },
  SYRINGE: {
    label: 'CHỌN ỐNG TIÊM',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    icon: Syringe,
  },
  MAIN: {
    label: 'MÀN HÌNH CHÍNH',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-muted-foreground/30',
    icon: Home,
  },
  SETUP: {
    label: 'CÀI ĐẶT',
    color: 'text-warning-foreground',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    icon: Settings,
  },
  ADJUST: {
    label: 'ĐIỀU CHỈNH',
    color: 'text-warning-foreground',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    icon: Settings,
  },
  PREPARE: {
    label: 'CHUẨN BỊ',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    borderColor: 'border-cyan-400/30',
    icon: Cog,
  },
  READY: {
    label: 'SẴN SÀNG',
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
    icon: CheckCircle2,
  },
  RESULT: {
    label: 'ĐANG CHẠY',
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
    icon: PlayCircle,
  },
  ERROR: {
    label: 'LỖI',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    icon: AlertTriangle,
  },
  DONE: {
    label: 'HOÀN THÀNH',
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
    icon: CheckCircle2,
  },
}

export function StateBadge({ state, paused = false, size = 'md' }: StateBadgeProps) {
  const config = stateConfig[state]
  const Icon = paused && state === 'RESULT' ? PauseCircle : config.icon
  const label = paused && state === 'RESULT' ? 'TAM DUNG' : config.label
  const color = paused && state === 'RESULT' ? 'text-warning-foreground' : config.color
  const bgColor = paused && state === 'RESULT' ? 'bg-warning/10' : config.bgColor
  const borderColor = paused && state === 'RESULT' ? 'border-warning/30' : config.borderColor

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  }

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 18,
  }

  const isAnimated = state === 'BOOT' || state === 'PREPARE' || (state === 'RESULT' && !paused)

  return (
    <motion.div
      className={`inline-flex items-center rounded-full font-semibold border ${sizeClasses[size]} ${color} ${bgColor} ${borderColor}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        animate={isAnimated ? { rotate: 360 } : {}}
        transition={isAnimated ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
      >
        <Icon size={iconSizes[size]} />
      </motion.div>
      <span className="tracking-wider">{label}</span>
    </motion.div>
  )
}
