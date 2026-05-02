'use client'

import { useState, useEffect } from 'react'
import { Settings, Syringe, Gauge, Droplets, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { PumpStatus, PumpConfig } from '@/lib/pump-types'
import { SYRINGE_SPECS } from '@/lib/pump-types'

interface ConfigCardProps {
  status: PumpStatus
  onSaveConfig: (config: PumpConfig) => Promise<void>
  disabled?: boolean
}

export function ConfigCard({ status, onSaveConfig, disabled }: ConfigCardProps) {
  const [syringeIndex, setSyringeIndex] = useState(status.syringe_index ?? 0)
  const [speed, setSpeed] = useState((status.speed_mlh ?? 0).toString())
  const [volume, setVolume] = useState((status.volume_ml ?? 0).toString())
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update local state when status changes
  useEffect(() => {
    setSyringeIndex(status.syringe_index ?? 0)
    setSpeed((status.speed_mlh ?? 0).toString())
    setVolume((status.volume_ml ?? 0).toString())
  }, [status.syringe_index, status.speed_mlh, status.volume_ml])

  const handleSave = async () => {
    setError(null)
    const speedNum = parseFloat(speed)
    const volumeNum = parseFloat(volume)

    if (isNaN(speedNum) || speedNum <= 0 || speedNum > 999) {
      setError('Toc do phai tu 0.1 den 999 ml/h')
      return
    }
    if (isNaN(volumeNum) || volumeNum <= 0 || volumeNum > 99) {
      setError('The tich phai tu 0.1 den 99 ml')
      return
    }

    setIsSaving(true)
    try {
      await onSaveConfig({
        syringe_index: syringeIndex,
        speed_mlh: speedNum,
        volume_ml: volumeNum,
      })
    } catch (e) {
      setError('Khong the luu cau hinh. Vui long thu lai.')
    } finally {
      setIsSaving(false)
    }
  }

  const isDisabled = disabled || status.pump_running

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          Cau hinh bom
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Syringe Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Syringe className="h-4 w-4" />
            Loai ong tiem
          </Label>
          <RadioGroup
            value={syringeIndex.toString()}
            onValueChange={(val) => setSyringeIndex(parseInt(val))}
            disabled={isDisabled}
            className="flex gap-4"
          >
            {SYRINGE_SPECS.map((spec, idx) => (
              <div key={spec.name} className="flex items-center space-x-2">
                <RadioGroupItem value={idx.toString()} id={`syringe-${idx}`} />
                <Label htmlFor={`syringe-${idx}`} className="cursor-pointer">
                  {spec.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Speed Input */}
        <div className="space-y-2">
          <Label htmlFor="speed" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Toc do (ml/h)
          </Label>
          <Input
            id="speed"
            type="number"
            step="0.1"
            min="0.1"
            max="999"
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
            disabled={isDisabled}
            className="font-mono"
          />
        </div>

        {/* Volume Input */}
        <div className="space-y-2">
          <Label htmlFor="volume" className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            The tich (ml)
          </Label>
          <Input
            id="volume"
            type="number"
            step="0.1"
            min="0.1"
            max="99"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            disabled={isDisabled}
            className="font-mono"
          />
        </div>

        {/* Estimated Time */}
        <div className="rounded-lg bg-muted p-3">
          <p className="text-sm text-muted-foreground">
            Thoi gian uoc tinh:{' '}
            <span className="font-mono font-medium text-foreground">
              {(() => {
                const s = parseFloat(speed)
                const v = parseFloat(volume)
                if (isNaN(s) || isNaN(v) || s <= 0) return '--:--'
                const totalSec = (v / s) * 3600
                const hours = Math.floor(totalSec / 3600)
                const mins = Math.floor((totalSec % 3600) / 60)
                return `${hours}h ${mins}m`
              })()}
            </span>
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button 
          onClick={handleSave} 
          disabled={isDisabled || isSaving}
          className="w-full"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </Button>

        {isDisabled && status.pump_running && (
          <p className="text-xs text-muted-foreground text-center">
            Không thể thay đổi cấu hình khi bơm đang chạy
          </p>
        )}
      </CardContent>
    </Card>
  )
}
