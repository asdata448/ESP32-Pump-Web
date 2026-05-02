'use client'

import { useState, useEffect } from 'react'
import { Zap, Eye, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { PIN_CONFIG, type PinState } from '@/lib/types'

interface GPIOControlProps {
  isConnected: boolean
  pinStates: Record<string, PinState>
  onWritePin: (pin: number, mode: 'digital' | 'pwm', value: number) => Promise<boolean>
  onReadPin: (pin: number | string) => Promise<PinState | null>
  onWatchPin: (pinId: string) => void
}

interface PinCardProps {
  id: string
  pin: number
  capabilities: string[]
  state: PinState | null
  isConnected: boolean
  onToggle: (pin: number, value: number) => void
  onPWMChange: (pin: number, value: number) => void
  onWatch: () => void
  onRefresh: () => void
}

function PinCard({
  id,
  pin,
  capabilities,
  state,
  isConnected,
  onToggle,
  onPWMChange,
  onWatch,
  onRefresh,
}: PinCardProps) {
  const [mode, setMode] = useState<'input' | 'output'>('output')
  const [pwmValue, setPwmValue] = useState(state?.value || 0)
  const [isAnimating, setIsAnimating] = useState(false)

  const isPWM = capabilities.includes('PWM')
  const isAnalog = capabilities.includes('ANALOG')
  const isHigh = state?.value === 1 || (state?.value ?? 0) > 0

  useEffect(() => {
    if (state?.value !== undefined && state.mode === 'pwm') {
      setPwmValue(state.value)
    }
  }, [state])

  const handleToggle = () => {
    if (!isConnected) return
    setIsAnimating(true)
    const newValue = isHigh ? 0 : 1
    onToggle(pin, newValue)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handlePWMChange = (value: number[]) => {
    setPwmValue(value[0])
  }

  const handlePWMCommit = () => {
    if (!isConnected) return
    onPWMChange(pin, pwmValue)
  }

  const capabilityColors: Record<string, string> = {
    PWM: 'bg-chart-1/20 text-chart-1 border-chart-1/30',
    ANALOG: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
    DIGITAL: 'bg-muted text-muted-foreground border-muted',
    TX: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
    RX: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
    SDA: 'bg-chart-5/20 text-chart-5 border-chart-5/30',
    SCL: 'bg-primary/20 text-primary border-primary/30',
  }

  return (
    <div
      className={`relative rounded-lg border bg-card/50 p-3 transition-all ${
        isConnected
          ? isHigh
            ? 'border-success/50 glow-green'
            : 'border-border hover:border-primary/50'
          : 'border-border/50 opacity-60'
      } ${isAnimating ? 'scale-95' : ''}`}
    >
      {/* Pin ID & Status LED */}
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-sm font-bold text-primary">{id}</span>
        <div
          className={`h-2.5 w-2.5 rounded-full transition-all ${
            isHigh ? 'bg-success glow-green' : 'bg-muted-foreground/30'
          }`}
        />
      </div>

      {/* Capability Badges */}
      <div className="mb-3 flex flex-wrap gap-1">
        {capabilities.map((cap) => (
          <Badge
            key={cap}
            variant="outline"
            className={`px-1.5 py-0 font-mono text-[9px] ${capabilityColors[cap] || ''}`}
          >
            {cap}
          </Badge>
        ))}
      </div>

      {/* Mode Toggle */}
      {!isAnalog && (
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground">MODE</span>
          <button
            onClick={() => setMode(mode === 'input' ? 'output' : 'input')}
            className="flex items-center gap-1 rounded border border-border px-2 py-0.5 font-mono text-[10px] transition-colors hover:border-primary"
          >
            {mode === 'input' ? (
              <>
                <ToggleLeft className="h-3 w-3" />
                IN
              </>
            ) : (
              <>
                <ToggleRight className="h-3 w-3" />
                OUT
              </>
            )}
          </button>
        </div>
      )}

      {/* Control Section */}
      {mode === 'output' && !isAnalog ? (
        isPWM ? (
          <div className="space-y-2">
            <Slider
              value={[pwmValue]}
              onValueChange={handlePWMChange}
              onValueCommit={handlePWMCommit}
              max={255}
              step={1}
              disabled={!isConnected}
              className="w-full"
            />
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-muted-foreground">PWM</span>
              <span className="text-primary">{pwmValue}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Switch
              checked={isHigh}
              onCheckedChange={handleToggle}
              disabled={!isConnected}
              className="data-[state=checked]:bg-success"
            />
          </div>
        )
      ) : isAnalog ? (
        <div className="text-center">
          <div className="font-mono text-2xl font-bold text-chart-2">
            {state?.value ?? '---'}
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">ADC VALUE</span>
        </div>
      ) : (
        <div className="flex items-center justify-center py-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={!isConnected}
            className="h-7 gap-1 font-mono text-[10px]"
          >
            <Eye className="h-3 w-3" />
            READ
          </Button>
        </div>
      )}

      {/* Watch Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onWatch}
        className="mt-2 h-6 w-full gap-1 font-mono text-[9px] text-muted-foreground hover:text-primary"
      >
        <Eye className="h-3 w-3" />
        WATCH
      </Button>
    </div>
  )
}

export function GPIOControl({
  isConnected,
  pinStates,
  onWritePin,
  onReadPin,
  onWatchPin,
}: GPIOControlProps) {
  const allPins = [...PIN_CONFIG.digital, ...PIN_CONFIG.analog]

  const handleToggle = (pin: number, value: number) => {
    onWritePin(pin, 'digital', value)
  }

  const handlePWMChange = (pin: number, value: number) => {
    onWritePin(pin, 'pwm', value)
  }

  return (
    <div className={`scanline-overlay rounded-lg border border-primary/30 bg-card p-4 transition-glow hover:border-primary/50 ${!isConnected ? 'offline-overlay' : ''}`}>
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider text-primary">
            <Zap className="h-4 w-4" />
            GPIO Control
          </h2>
          <span className="font-mono text-[10px] text-muted-foreground">
            {allPins.length} PINS
          </span>
        </div>

        {/* Pin Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {allPins.map((pinConfig) => (
            <PinCard
              key={pinConfig.id}
              id={pinConfig.id}
              pin={pinConfig.pin}
              capabilities={pinConfig.capabilities}
              state={pinStates[pinConfig.pin] || pinStates[pinConfig.id] || null}
              isConnected={isConnected}
              onToggle={handleToggle}
              onPWMChange={handlePWMChange}
              onWatch={() => onWatchPin(pinConfig.id)}
              onRefresh={() => onReadPin(pinConfig.pin)}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-border/50 pt-4">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-success glow-green" />
            <span className="font-mono text-[10px] text-muted-foreground">HIGH</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="font-mono text-[10px] text-muted-foreground">LOW</span>
          </div>
        </div>
      </div>
    </div>
  )
}
