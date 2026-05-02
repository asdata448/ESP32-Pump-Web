'use client'

import { Wifi, WifiOff, Activity, Cpu, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PumpStatus, PumpState } from '@/lib/pump-types'
import { STATE_LABELS, getStateColor, getStateBgColor } from '@/lib/pump-types'

interface HeaderProps {
  status: PumpStatus
  isConnected: boolean
  isDemo: boolean
  onSettingsClick: () => void
}

export function Header({ status, isConnected, isDemo, onSettingsClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between gap-4 px-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">
              May bom tiem dien ESP32
            </h1>
            <p className="text-xs text-muted-foreground">
              He thong giam sat va dieu khien
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Demo Mode Badge */}
          {isDemo && (
            <Badge variant="outline" className="border-warning text-warning-foreground bg-warning/10">
              CHE DO DEMO
            </Badge>
          )}

          {/* Connection Status */}
          <Badge 
            variant={isConnected ? 'default' : 'destructive'}
            className={isConnected ? 'bg-success text-success-foreground' : ''}
          >
            {isConnected ? (
              <>
                <Wifi className="mr-1 h-3 w-3" />
                Truc tuyen
              </>
            ) : (
              <>
                <WifiOff className="mr-1 h-3 w-3" />
                Ngoai tuyen
              </>
            )}
          </Badge>

          {/* WiFi Mode */}
          <Badge variant="secondary">
            {status.wifi_mode === 'AP' ? 'AP Mode' : 'STA Mode'}
          </Badge>

          {/* IP Address */}
          <Badge variant="outline" className="font-mono text-xs">
            {status.ip}
          </Badge>

          {/* Current State */}
          <Badge className={`${getStateBgColor(status.state)} ${getStateColor(status.state)} border-0`}>
            <Activity className="mr-1 h-3 w-3" />
            {STATE_LABELS[status.state]}
          </Badge>

          {/* Settings Button */}
          <Button variant="ghost" size="icon" onClick={onSettingsClick}>
            <Settings className="h-5 w-5" />
            <span className="sr-only">Cai dat</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
