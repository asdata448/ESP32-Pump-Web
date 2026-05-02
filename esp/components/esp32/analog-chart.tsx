'use client'

import { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { PIN_CONFIG } from '@/lib/types'

interface AnalogChartProps {
  isConnected: boolean
  analogValues: Record<string, number[]>
  onReadAnalog: (pin: string) => void
}

const PIN_COLORS: Record<string, string> = {
  A0: '#00e5ff',
  A1: '#00ff88',
  A2: '#ff6b35',
  A3: '#a855f7',
  A4: '#eab308',
  A5: '#ec4899',
}

export function AnalogChart({
  isConnected,
  analogValues,
  onReadAnalog,
}: AnalogChartProps) {
  const [selectedPins, setSelectedPins] = useState<string[]>(['A0'])
  const [timeWindow, setTimeWindow] = useState('30')
  const analogPins = PIN_CONFIG.analog.map((p) => p.id)

  // Fetch analog data periodically
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(() => {
      selectedPins.forEach((pin) => {
        onReadAnalog(pin)
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isConnected, selectedPins, onReadAnalog])

  const togglePin = (pin: string) => {
    setSelectedPins((prev) =>
      prev.includes(pin) ? prev.filter((p) => p !== pin) : [...prev, pin]
    )
  }

  // Prepare chart data
  const maxDataPoints = parseInt(timeWindow) * 2 // 500ms intervals
  const chartData = []

  const maxLength = Math.max(
    ...selectedPins.map((pin) => (analogValues[pin] || []).length)
  )

  for (let i = 0; i < Math.min(maxLength, maxDataPoints); i++) {
    const dataPoint: Record<string, number | string> = {
      time: `-${((maxLength - i - 1) * 0.5).toFixed(1)}s`,
    }
    selectedPins.forEach((pin) => {
      const values = analogValues[pin] || []
      const index = values.length - maxLength + i
      if (index >= 0) {
        dataPoint[pin] = values[index]
      }
    })
    chartData.push(dataPoint)
  }

  return (
    <div className={`scanline-overlay rounded-lg border border-primary/30 bg-card p-4 transition-glow hover:border-primary/50 ${!isConnected ? 'offline-overlay' : ''}`}>
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider text-primary">
            <Activity className="h-4 w-4" />
            Analog Readings
          </h2>
          <Select value={timeWindow} onValueChange={setTimeWindow}>
            <SelectTrigger className="h-6 w-20 font-mono text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10s</SelectItem>
              <SelectItem value="30">30s</SelectItem>
              <SelectItem value="60">1min</SelectItem>
              <SelectItem value="300">5min</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pin Selection */}
        <div className="mb-4 flex flex-wrap gap-3">
          {analogPins.map((pin) => (
            <label
              key={pin}
              className="flex cursor-pointer items-center gap-2"
            >
              <Checkbox
                checked={selectedPins.includes(pin)}
                onCheckedChange={() => togglePin(pin)}
                className="border-muted-foreground data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              />
              <span
                className="font-mono text-xs"
                style={{ color: PIN_COLORS[pin] }}
              >
                {pin}
              </span>
            </label>
          ))}
        </div>

        {/* Chart */}
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis
                dataKey="time"
                tick={{ fill: '#8892a4', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#1e3a5f' }}
              />
              <YAxis
                domain={[0, 1023]}
                tick={{ fill: '#8892a4', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#1e3a5f' }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f1729',
                  border: '1px solid #1e3a5f',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                }}
                labelStyle={{ color: '#8892a4' }}
              />
              {selectedPins.map((pin) => (
                <Line
                  key={pin}
                  type="monotone"
                  dataKey={pin}
                  stroke={PIN_COLORS[pin]}
                  strokeWidth={2}
                  dot={false}
                  animationDuration={100}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Current Values */}
        <div className="mt-4 flex flex-wrap justify-center gap-4 border-t border-border/50 pt-3">
          {selectedPins.map((pin) => {
            const values = analogValues[pin] || []
            const currentValue = values[values.length - 1] ?? 0
            return (
              <div
                key={pin}
                className="flex items-center gap-2 rounded border border-border/50 px-3 py-1"
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: PIN_COLORS[pin] }}
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {pin}:
                </span>
                <span
                  className="font-mono text-sm font-bold"
                  style={{ color: PIN_COLORS[pin] }}
                >
                  {currentValue}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
