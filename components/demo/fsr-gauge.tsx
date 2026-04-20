'use client'

import { motion } from 'framer-motion'
import { FSR_THRESHOLDS } from '@/lib/demo-types'

interface FSRGaugeProps {
  value: number
  presenceThreshold: number
  occlusionThreshold: number
  isAlert: boolean
}

export function FSRGauge({
  value,
  presenceThreshold,
  occlusionThreshold,
  isAlert,
}: FSRGaugeProps) {
  const maxValue = 4095
  const percentage = Math.min(100, (value / maxValue) * 100)
  const presencePercent = (presenceThreshold / maxValue) * 100
  const occlusionPercent = (occlusionThreshold / maxValue) * 100

  // Determine color based on value
  const getBarColor = () => {
    if (value >= occlusionThreshold) return 'from-destructive to-red-600'
    if (value >= presenceThreshold) return 'from-success to-green-600'
    return 'from-muted-foreground to-gray-500'
  }

  // Determine status text
  const getStatus = () => {
    if (value >= occlusionThreshold) return { text: 'NGHEN', color: 'text-destructive' }
    if (value >= presenceThreshold) return { text: 'TIEP XUC', color: 'text-success' }
    return { text: 'KHONG TAI', color: 'text-muted-foreground' }
  }

  const status = getStatus()

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Cam bien FSR</span>
        <span className={`text-xs font-bold ${status.color}`}>{status.text}</span>
      </div>

      {/* Gauge track */}
      <div className="relative h-6 bg-[#142840] rounded overflow-hidden">
        {/* Threshold markers */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-success/50 z-10"
          style={{ left: `${presencePercent}%` }}
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-success whitespace-nowrap">
            {presenceThreshold}
          </div>
        </div>
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-destructive/50 z-10"
          style={{ left: `${occlusionPercent}%` }}
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-destructive whitespace-nowrap">
            {occlusionThreshold}
          </div>
        </div>

        {/* Zone colors */}
        <div 
          className="absolute inset-y-0 left-0 bg-muted/20"
          style={{ width: `${presencePercent}%` }}
        />
        <div 
          className="absolute inset-y-0 bg-success/10"
          style={{ left: `${presencePercent}%`, width: `${occlusionPercent - presencePercent}%` }}
        />
        <div 
          className="absolute inset-y-0 right-0 bg-destructive/10"
          style={{ left: `${occlusionPercent}%` }}
        />

        {/* Value bar */}
        <motion.div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getBarColor()} rounded`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />

        {/* Value label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="text-sm font-mono font-bold text-white drop-shadow-lg"
            animate={isAlert ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: isAlert ? Infinity : 0 }}
          >
            {Math.round(value)}
          </motion.span>
        </div>
      </div>

      {/* Scale */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>0</span>
        <span>1000</span>
        <span>2000</span>
        <span>3000</span>
        <span>4095</span>
      </div>
    </div>
  )
}
