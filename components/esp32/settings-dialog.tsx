'use client'

import { useState } from 'react'
import { Settings, Download, Upload, RotateCcw, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  settings: {
    pollingInterval: number
    autoReconnect: boolean
  }
  onSettingsChange: (settings: { pollingInterval: number; autoReconnect: boolean }) => void
}

export function SettingsDialog({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: SettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState(settings)

  const handleSave = () => {
    onSettingsChange(localSettings)
    localStorage.setItem('esp32-settings', JSON.stringify(localSettings))
    onClose()
  }

  const handleExport = () => {
    const config = localStorage.getItem('esp32-config') || '{}'
    const settingsData = localStorage.getItem('esp32-settings') || '{}'
    const exportData = {
      config: JSON.parse(config),
      settings: JSON.parse(settingsData),
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'esp32-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (data.config) {
          localStorage.setItem('esp32-config', JSON.stringify(data.config))
        }
        if (data.settings) {
          localStorage.setItem('esp32-settings', JSON.stringify(data.settings))
          setLocalSettings(data.settings)
        }
        window.location.reload()
      } catch {
        // Ignore parse errors
      }
    }
    input.click()
  }

  const handleReset = () => {
    localStorage.removeItem('esp32-config')
    localStorage.removeItem('esp32-settings')
    window.location.reload()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-primary/30 bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-primary">
            <Settings className="h-4 w-4" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <FieldGroup className="space-y-6">
          {/* Polling Interval */}
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel className="font-mono text-xs text-muted-foreground">
                POLLING INTERVAL
              </FieldLabel>
              <span className="font-mono text-xs text-primary">
                {localSettings.pollingInterval}ms
              </span>
            </div>
            <Slider
              value={[localSettings.pollingInterval]}
              onValueChange={([v]) =>
                setLocalSettings({ ...localSettings, pollingInterval: v })
              }
              min={250}
              max={5000}
              step={250}
              className="mt-2"
            />
          </Field>

          {/* Auto Reconnect */}
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel className="font-mono text-xs text-muted-foreground">
                AUTO RECONNECT
              </FieldLabel>
              <Switch
                checked={localSettings.autoReconnect}
                onCheckedChange={(v) =>
                  setLocalSettings({ ...localSettings, autoReconnect: v })
                }
              />
            </div>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Automatically reconnect after 5 seconds if connection is lost
            </p>
          </Field>

          <Separator className="bg-border/50" />

          {/* Data Management */}
          <div className="space-y-2">
            <span className="font-mono text-xs text-muted-foreground">
              DATA MANAGEMENT
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="flex-1 gap-2 font-mono text-[10px]"
              >
                <Download className="h-3 w-3" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImport}
                className="flex-1 gap-2 font-mono text-[10px]"
              >
                <Upload className="h-3 w-3" />
                Import
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="w-full gap-2 font-mono text-[10px] text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="h-3 w-3" />
              Reset All Settings
            </Button>
          </div>

          <Separator className="bg-border/50" />

          {/* About */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">VERSION</span>
              <span className="font-mono text-xs text-foreground">1.0.0</span>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-mono text-xs text-primary hover:underline"
            >
              <Github className="h-3 w-3" />
              View on GitHub
            </a>
          </div>
        </FieldGroup>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="mt-4 w-full gap-2 bg-primary font-mono text-xs uppercase tracking-wider text-primary-foreground"
        >
          Save Settings
        </Button>
      </DialogContent>
    </Dialog>
  )
}
