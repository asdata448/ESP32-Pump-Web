'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  AlertTriangle, 
  ToggleLeft, 
  ToggleRight,
  Play,
  Wifi,
  WifiOff,
  Gauge,
  CircleDot
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import type { DemoControlFlags } from '@/lib/demo-types'
import { FSR_THRESHOLDS } from '@/lib/demo-types'

interface DemoControlPanelProps {
  controlFlags: DemoControlFlags
  onUpdateFlags: (flags: Partial<DemoControlFlags>) => void
  onTriggerOcclusion: () => void
  onRunAutoDemo: () => void
  isAutoDemo: boolean
  disabled?: boolean
}

export function DemoControlPanel({
  controlFlags,
  onUpdateFlags,
  onTriggerOcclusion,
  onRunAutoDemo,
  isAutoDemo,
  disabled = false,
}: DemoControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="medical-panel p-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Bang dieu khien mo phong</span>
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
            className="space-y-4 overflow-hidden"
          >
            {/* Simulation Mode Toggle */}
            <div className="flex items-center justify-between p-3 medical-panel-inner rounded-lg">
              <div className="flex items-center gap-2">
                {controlFlags.simulateHardware ? (
                  <Wifi className="h-4 w-4 text-success" />
                ) : (
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">Mo phong phan cung</span>
              </div>
              <Switch
                checked={controlFlags.simulateHardware}
                onCheckedChange={(checked) => onUpdateFlags({ simulateHardware: checked })}
                disabled={disabled}
              />
            </div>

            {/* FSR Manual Control */}
            <div className="p-3 medical-panel-inner rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Gia tri FSR thu cong</span>
                <span className="text-sm font-mono text-primary">
                  {controlFlags.manualFsrValue}
                </span>
              </div>
              <Slider
                value={[controlFlags.manualFsrValue]}
                onValueChange={([value]) => onUpdateFlags({ manualFsrValue: value })}
                min={0}
                max={4095}
                step={10}
                disabled={disabled || !controlFlags.simulateHardware}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Khong tai (0-450)</span>
                <span>Tiep xuc (450-2000)</span>
                <span>Nghen ({'>'}2000)</span>
              </div>
            </div>

            {/* Manual Toggles */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateFlags({ manualContactDetected: !controlFlags.manualContactDetected })}
                disabled={disabled || !controlFlags.simulateHardware}
                className={`p-3 rounded-lg flex items-center gap-2 transition-colors ${
                  controlFlags.manualContactDetected
                    ? 'bg-success/20 border border-success/30'
                    : 'medical-panel-inner'
                }`}
              >
                <CircleDot className={`h-4 w-4 ${controlFlags.manualContactDetected ? 'text-success' : 'text-muted-foreground'}`} />
                <span className="text-xs">Tiep xuc piston</span>
              </button>

              <button
                onClick={() => onUpdateFlags({ manualLimitPressed: !controlFlags.manualLimitPressed })}
                disabled={disabled || !controlFlags.simulateHardware}
                className={`p-3 rounded-lg flex items-center gap-2 transition-colors ${
                  controlFlags.manualLimitPressed
                    ? 'bg-warning/20 border border-warning/30'
                    : 'medical-panel-inner'
                }`}
              >
                <ToggleRight className={`h-4 w-4 ${controlFlags.manualLimitPressed ? 'text-warning-foreground' : 'text-muted-foreground'}`} />
                <span className="text-xs">Limit switch</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                onClick={onTriggerOcclusion}
                disabled={disabled}
                variant="destructive"
                className="w-full gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Gay loi nghen
              </Button>

              <Button
                onClick={onRunAutoDemo}
                disabled={disabled || isAutoDemo}
                className="w-full gap-2 btn-primary"
              >
                <Play className="h-4 w-4" />
                {isAutoDemo ? 'Dang chay demo...' : 'Chay kich ban demo tu dong'}
              </Button>
            </div>

            {/* Online/Offline Toggle */}
            <div className="flex items-center justify-between p-3 medical-panel-inner rounded-lg">
              <span className="text-sm">Gia lap trang thai</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${controlFlags.forceOnline ? 'text-success' : 'text-muted-foreground'}`}>
                  {controlFlags.forceOnline ? 'Online' : 'Offline'}
                </span>
                <Switch
                  checked={controlFlags.forceOnline}
                  onCheckedChange={(checked) => onUpdateFlags({ forceOnline: checked })}
                  disabled={disabled}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
