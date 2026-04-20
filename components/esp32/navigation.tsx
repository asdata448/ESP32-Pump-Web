'use client'

import { Cpu, Wifi, WifiOff, Loader2, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

interface NavigationProps {
  ip: string
  port: number
  isConnected: boolean
  isConnecting: boolean
  latency: number | null
  isDemoMode: boolean
  onConnect: () => void
  onDisconnect: () => void
  onConfigChange: (ip: string, port: number) => void
  onOpenSettings: () => void
}

export function Navigation({
  ip,
  port,
  isConnected,
  isConnecting,
  latency,
  isDemoMode,
  onConnect,
  onDisconnect,
  onConfigChange,
  onOpenSettings,
}: NavigationProps) {
  const [localIp, setLocalIp] = useState(ip)
  const [localPort, setLocalPort] = useState(port.toString())

  const handleConnect = () => {
    onConfigChange(localIp, parseInt(localPort) || 80)
    if (isConnected) {
      onDisconnect()
    } else {
      onConnect()
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-primary/30 bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Cpu className="h-8 w-8 text-primary" />
            <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-lg font-bold tracking-wider text-primary">
              ESP32 CTRL
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Command Center
            </span>
          </div>
        </div>

        {/* Connection Status */}
        <div className="hidden items-center gap-6 md:flex">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center gap-2">
              {isConnecting ? (
                <>
                  <div className="h-3 w-3 rounded-full bg-warning animate-pulse" />
                  <span className="font-mono text-xs text-warning">CONNECTING...</span>
                </>
              ) : isConnected ? (
                <>
                  <div className="h-3 w-3 rounded-full bg-success animate-pulse-glow glow-green" />
                  <span className="font-mono text-xs text-success">CONNECTED</span>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 rounded-full bg-destructive animate-blink" />
                  <span className="font-mono text-xs text-destructive">OFFLINE</span>
                </>
              )}
            </div>
            {isDemoMode && (
              <Badge variant="outline" className="border-warning text-warning font-mono text-[10px]">
                DEMO
              </Badge>
            )}
          </div>

          {/* Connection Config */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded border border-border bg-background/50 px-2">
              <span className="font-mono text-xs text-muted-foreground">IP:</span>
              <Input
                value={localIp}
                onChange={(e) => setLocalIp(e.target.value)}
                className="h-7 w-32 border-0 bg-transparent px-1 font-mono text-xs focus-visible:ring-0"
                placeholder="192.168.1.100"
              />
            </div>
            <div className="flex items-center gap-1 rounded border border-border bg-background/50 px-2">
              <span className="font-mono text-xs text-muted-foreground">PORT:</span>
              <Input
                value={localPort}
                onChange={(e) => setLocalPort(e.target.value)}
                className="h-7 w-14 border-0 bg-transparent px-1 font-mono text-xs focus-visible:ring-0"
                placeholder="80"
              />
            </div>
          </div>

          {/* Connect Button */}
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            variant={isConnected ? 'destructive' : 'default'}
            className={`h-8 gap-2 font-mono text-xs uppercase tracking-wider ${
              !isConnected && !isConnecting
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan'
                : ''
            }`}
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isConnected ? (
              <WifiOff className="h-4 w-4" />
            ) : (
              <Wifi className="h-4 w-4" />
            )}
            {isConnecting ? 'Connecting' : isConnected ? 'Disconnect' : 'Connect'}
          </Button>

          {/* Latency */}
          {isConnected && latency !== null && (
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-muted-foreground">PING:</span>
              <span className={latency < 50 ? 'text-success' : latency < 100 ? 'text-warning' : 'text-destructive'}>
                {latency}ms
              </span>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          className="h-8 w-8 text-muted-foreground hover:text-primary"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Connection Bar */}
      <div className="flex items-center gap-2 border-t border-border/50 px-4 py-2 md:hidden">
        <Input
          value={localIp}
          onChange={(e) => setLocalIp(e.target.value)}
          className="h-8 flex-1 font-mono text-xs"
          placeholder="ESP32 IP"
        />
        <Input
          value={localPort}
          onChange={(e) => setLocalPort(e.target.value)}
          className="h-8 w-16 font-mono text-xs"
          placeholder="Port"
        />
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          size="sm"
          variant={isConnected ? 'destructive' : 'default'}
          className="h-8 font-mono text-xs"
        >
          {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : isConnected ? 'DC' : 'GO'}
        </Button>
      </div>
    </nav>
  )
}
