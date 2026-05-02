'use client'

import { useState } from 'react'
import { X, Syringe, Gauge, Droplet, Save } from 'lucide-react'
import type { PumpStatus, PumpConfig } from '@/lib/pump-types'
import { SYRINGE_SPECS } from '@/lib/pump-types'

interface ConfigurationDialogProps {
  isOpen: boolean
  onClose: () => void
  status: PumpStatus
  onSaveConfig: (config: PumpConfig) => Promise<void>
  onPrepare: () => Promise<void>
}

export function ConfigurationDialog({
  isOpen,
  onClose,
  status,
  onSaveConfig,
  onPrepare
}: ConfigurationDialogProps) {
  const [syringeIndex, setSyringeIndex] = useState(status.syringe_index ?? 0)
  const [speed, setSpeed] = useState((status.speed_mlh ?? 0).toString())
  const [volume, setVolume] = useState((status.volume_ml ?? 0).toString())
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSaveConfig({
        syringe_index: syringeIndex,
        speed_mlh: parseFloat(speed) || 1.0,
        volume_ml: parseFloat(volume) || 5,
      })
      await onPrepare()
      onClose()
    } catch (error) {
      console.error('Failed to save config:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="medical-panel relative z-10 w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Cài đặt truyền dịch</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Syringe Selection */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Syringe className="h-4 w-4" />
            Loại ống tiêm
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SYRINGE_SPECS.map((spec, index) => (
              <button
                key={spec.name}
                onClick={() => setSyringeIndex(index)}
                className={`p-3 rounded-lg border transition-colors ${
                  syringeIndex === index 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-border bg-secondary/30 text-white hover:border-primary/50'
                }`}
              >
                <div className="text-lg font-bold">{spec.name}</div>
                <div className="text-xs text-muted-foreground">{spec.mmPerMl} mm/ml</div>
              </button>
            ))}
          </div>
        </div>

        {/* Speed Input */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Gauge className="h-4 w-4" />
            Tốc độ truyền (ml/h)
          </label>
          <input
            type="number"
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
            min="0.1"
            max="500"
            step="0.1"
            className="w-full bg-input border border-border rounded-lg px-4 py-3 text-white text-lg font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="1.0"
          />
          <div className="mt-1 text-xs text-muted-foreground">
            Phạm vi: 0.1 - 500 ml/h
          </div>
        </div>

        {/* Volume Input */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Droplet className="h-4 w-4" />
            Thể tích truyền (ml)
          </label>
          <input
            type="number"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            min="0.1"
            max={syringeIndex === 0 ? 10 : 20}
            step="0.1"
            className="w-full bg-input border border-border rounded-lg px-4 py-3 text-white text-lg font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="5"
          />
          <div className="mt-1 text-xs text-muted-foreground">
            Tối đa: {syringeIndex === 0 ? 10 : 20} ml ({SYRINGE_SPECS[syringeIndex]?.name})
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-control btn-secondary flex-1"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-control btn-primary flex-1"
          >
            {isSaving ? (
              'Đang lưu...'
            ) : (
              <>
                <Save className="h-4 w-4" />
                Lưu & Chuẩn bị
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
