'use client'

import { Wifi, WifiOff, CheckCircle2, XCircle, Clock, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'

interface NetworkConfigProps {
  ip: string
  port: number
  isConnected: boolean
  isConnecting: boolean
  latency: number | null
  lastPing: string | null
  isDemoMode: boolean
  onTestConnection: () => Promise<boolean>
  onSaveConfig: (ip: string, port: number) => void
}

export function NetworkConfig({
  ip,
  port,
  isConnected,
  isConnecting,
  latency,
  lastPing,
  isDemoMode,
  onTestConnection,
  onSaveConfig,
}: NetworkConfigProps) {
  const [localIp, setLocalIp] = useState(ip)
  const [localPort, setLocalPort] = useState(port.toString())
  const [authToken, setAuthToken] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [signalStrength, setSignalStrength] = useState(3)

  useEffect(() => {
    setLocalIp(ip)
    setLocalPort(port.toString())
  }, [ip, port])

  // Simulate WiFi signal animation
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        setSignalStrength(prev => {
          if (prev >= 4) return 1
          return prev + 1
        })
      }, 500)
      return () => clearInterval(interval)
    }
  }, [isConnected])

  const handleTestConnection = async () => {
    setIsTesting(true)
    await onTestConnection()
    setIsTesting(false)
  }

  const handleSave = () => {
    onSaveConfig(localIp, parseInt(localPort) || 80)
  }

  const isValidIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(localIp)

  return (
    <div className="scanline-overlay rounded-lg border border-primary/30 bg-card p-4 transition-glow hover:border-primary/50">
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider text-primary">
            <Wifi className="h-4 w-4" />
            Network Config
          </h2>
          {/* Signal Strength Indicator */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((bar) => (
              <div
                key={bar}
                className={`w-1 rounded-sm transition-all ${
                  isConnected && bar <= signalStrength
                    ? 'bg-success'
                    : 'bg-muted'
                }`}
                style={{ height: `${bar * 3 + 4}px` }}
              />
            ))}
          </div>
        </div>

        {/* Config Fields */}
        <FieldGroup className="space-y-3">
          <Field>
            <FieldLabel className="font-mono text-xs text-muted-foreground">
              ESP32 IP ADDRESS
            </FieldLabel>
            <Input
              value={localIp}
              onChange={(e) => setLocalIp(e.target.value)}
              className={`h-9 font-mono text-sm ${
                !isValidIp && localIp ? 'border-destructive' : ''
              }`}
              placeholder="192.168.1.100"
            />
          </Field>

          <Field>
            <FieldLabel className="font-mono text-xs text-muted-foreground">
              PORT
            </FieldLabel>
            <Input
              value={localPort}
              onChange={(e) => setLocalPort(e.target.value)}
              className="h-9 font-mono text-sm"
              placeholder="80"
            />
          </Field>

          <Field>
            <FieldLabel className="font-mono text-xs text-muted-foreground">
              AUTH TOKEN (OPTIONAL)
            </FieldLabel>
            <Input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              className="h-9 font-mono text-sm"
              placeholder="Enter token..."
            />
          </Field>
        </FieldGroup>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          <Button
            onClick={handleTestConnection}
            disabled={isTesting || isConnecting || !isValidIp}
            className="flex-1 gap-2 font-mono text-xs uppercase tracking-wider"
            variant="outline"
          >
            {isTesting ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isConnected ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            Test
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValidIp}
            className="flex-1 gap-2 bg-primary font-mono text-xs uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-3 w-3" />
            Save
          </Button>
        </div>

        {/* Status Display */}
        <div className="mt-4 space-y-2 rounded border border-border/50 bg-background/30 p-3">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-muted-foreground">IP:</span>
            <span className="text-foreground">{ip}</span>
          </div>
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-muted-foreground">PORT:</span>
            <span className="text-foreground">{port}</span>
          </div>
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-muted-foreground">STATUS:</span>
            <span className={isConnected ? 'text-success' : 'text-destructive'}>
              {isConnected ? (isDemoMode ? 'DEMO' : 'ONLINE') : 'OFFLINE'}
            </span>
          </div>
          {lastPing && (
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                LAST PING:
              </span>
              <span className="text-foreground">
                {new Date(lastPing).toLocaleTimeString()}
              </span>
            </div>
          )}
          {latency !== null && (
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-muted-foreground">LATENCY:</span>
              <span className={latency < 50 ? 'text-success' : latency < 100 ? 'text-warning' : 'text-destructive'}>
                {latency}ms
              </span>
            </div>
          )}
        </div>

        {/* Offline Indicator */}
        {!isConnected && !isConnecting && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded border border-destructive/30 bg-destructive/10 p-2">
            <WifiOff className="h-4 w-4 text-destructive" />
            <span className="font-mono text-xs text-destructive">NO CONNECTION</span>
          </div>
        )}
      </div>
    </div>
  )
}
