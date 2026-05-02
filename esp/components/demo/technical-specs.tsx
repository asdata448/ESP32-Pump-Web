'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Cpu, Zap } from 'lucide-react'
import { TECHNICAL_SPECS, SYRINGE_CALIBRATION } from '@/lib/demo-types'

export function TechnicalSpecs() {
  const [isExpanded, setIsExpanded] = useState(false)

  const gpioRows = [
    { label: 'ENA (Enable)', pin: TECHNICAL_SPECS.gpio.ENA },
    { label: 'DIR (Direction)', pin: TECHNICAL_SPECS.gpio.DIR },
    { label: 'PUL (Pulse)', pin: TECHNICAL_SPECS.gpio.PUL },
    { label: 'FSR (Force Sensor)', pin: TECHNICAL_SPECS.gpio.FSR },
    { label: 'BUZZER', pin: TECHNICAL_SPECS.gpio.BUZZER },
    { label: 'LIMIT Switch', pin: TECHNICAL_SPECS.gpio.LIMIT },
    { label: 'TFT CS', pin: TECHNICAL_SPECS.gpio.TFT_CS },
    { label: 'TFT DC', pin: TECHNICAL_SPECS.gpio.TFT_DC },
    { label: 'TFT RST', pin: TECHNICAL_SPECS.gpio.TFT_RST },
    { label: 'Touch CS', pin: TECHNICAL_SPECS.gpio.T_CS },
    { label: 'Touch IRQ', pin: TECHNICAL_SPECS.gpio.T_IRQ },
  ]

  return (
    <div className="medical-panel p-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Thông số kỹ thuật mô phỏng</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              {/* GPIO Pins */}
              <div className="medical-panel-inner rounded-lg p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-3.5 w-3.5 text-warning-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">GPIO PINS</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {gpioRows.map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-mono text-primary">GPIO{row.pin}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Motor Specs */}
              <div className="medical-panel-inner rounded-lg p-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2">ĐỘNG CƠ BƯỚC</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Steps/rev</span>
                    <span className="font-mono text-primary">{TECHNICAL_SPECS.motor.stepsPerRev}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Microstep</span>
                    <span className="font-mono text-primary">1/{TECHNICAL_SPECS.motor.microstep}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tổng steps/rev</span>
                    <span className="font-mono text-primary">{TECHNICAL_SPECS.motor.totalStepsPerRev}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bước vít me</span>
                    <span className="font-mono text-primary">{TECHNICAL_SPECS.leadScrew.pitchMm}mm</span>
                  </div>
                </div>
              </div>

              {/* Syringe Calibration */}
              <div className="medical-panel-inner rounded-lg p-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2">HIỆU CHUẨN ỐNG TIÊM</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs p-2 bg-primary/5 rounded">
                    <span className="font-medium">10CC</span>
                    <div className="flex gap-3">
                      <span className="text-muted-foreground">
                        {SYRINGE_CALIBRATION['10CC'].mmPerMl} mm/ml
                      </span>
                      <span className="text-primary font-mono">
                        {SYRINGE_CALIBRATION['10CC'].stepsPerMl} steps/ml
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 bg-primary/5 rounded">
                    <span className="font-medium">20CC</span>
                    <div className="flex gap-3">
                      <span className="text-muted-foreground">
                        {SYRINGE_CALIBRATION['20CC'].mmPerMl} mm/ml
                      </span>
                      <span className="text-primary font-mono">
                        {SYRINGE_CALIBRATION['20CC'].stepsPerMl} steps/ml
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
