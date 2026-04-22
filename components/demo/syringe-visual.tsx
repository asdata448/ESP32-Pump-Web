'use client'

import { motion } from 'framer-motion'
import type { SyringeType } from '@/lib/pump-types'

interface SyringeVisualProps {
  syringeType: SyringeType
  progressPercent: number
  isRunning: boolean
  isPaused: boolean
  contactFound: boolean
}

export function SyringeVisual({
  syringeType,
  progressPercent,
  isRunning,
  isPaused,
  contactFound,
}: SyringeVisualProps) {
  // Plunger position: 100% = full (at top), 0% = empty (at bottom)
  const plungerPosition = 100 - progressPercent

  return (
    <div className="relative flex items-center justify-center py-4">
      {/* Syringe Container */}
      <div className="relative w-20 h-48">
        {/* Barrel outer */}
        <div className="absolute inset-x-2 top-8 bottom-4 bg-gradient-to-b from-[#e8f4f8] to-[#d0e8f0] rounded-sm border border-[#8ab4c0] shadow-inner">
          {/* Graduation marks */}
          <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col justify-between py-2 px-1">
            {[...Array(11)].map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`h-px ${i % 5 === 0 ? 'w-3 bg-[#4a7a8a]' : 'w-2 bg-[#8ab4c0]'}`} />
                {i % 5 === 0 && (
                  <span className="text-[8px] text-[#4a7a8a] font-mono">
                    {syringeType === '10CC' ? 10 - i : 20 - i * 2}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Liquid */}
          <motion.div
            className="absolute inset-x-1 bottom-1 rounded-sm bg-gradient-to-b from-[#00d4ff]/30 to-[#00d4ff]/50"
            initial={{ height: '90%' }}
            animate={{ height: `${Math.max(5, plungerPosition)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        {/* Plunger */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-14"
          initial={{ top: '5%' }}
          animate={{ top: `${Math.min(85, 5 + (progressPercent * 0.8))}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Plunger rod */}
          <div className="w-1.5 h-16 mx-auto bg-gradient-to-b from-[#a0a0a0] to-[#808080] rounded-t-sm -mb-1" />
          {/* Plunger head */}
          <div className="w-12 h-3 mx-auto bg-gradient-to-b from-[#606060] to-[#404040] rounded-sm shadow-md" />
          {/* Rubber seal */}
          <div className="w-14 h-2 mx-auto bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-sm" />
        </motion.div>

        {/* Needle hub */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-6 bg-gradient-to-b from-[#e0e0e0] to-[#c0c0c0] rounded-b-sm" />
        
        {/* Needle */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-[#c0c0c0] to-[#a0a0a0]" />

        {/* Finger grips */}
        <div className="absolute top-6 -left-1 w-4 h-2 bg-gradient-to-r from-[#d0d0d0] to-[#e0e0e0] rounded-l-full" />
        <div className="absolute top-6 -right-1 w-4 h-2 bg-gradient-to-l from-[#d0d0d0] to-[#e0e0e0] rounded-r-full" />

        {/* Contact indicator */}
        {contactFound && (
          <motion.div
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-success"
            animate={{ 
              scale: isRunning && !isPaused ? [1, 1.2, 1] : 1,
              opacity: isRunning && !isPaused ? [1, 0.7, 1] : 1 
            }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 text-xs font-mono text-muted-foreground">
        {syringeType}
      </div>

      {/* Status */}
      {isRunning && (
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-1"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-xs text-success font-medium">
            <br>
            </br>
            <br>
            </br>
            {isPaused ? 'TẠM DỪNG' : 'ĐANG BƠM'}
           
          </span>
        </motion.div>
      )}
    </div>
  )
}
