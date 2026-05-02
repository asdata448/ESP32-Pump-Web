'use client'

import { useEffect, useState } from 'react'
import { Cpu, Wifi, HardDrive, Clock, Thermometer, Users } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type { SystemInfo as SystemInfoType } from '@/lib/types'

interface SystemInfoProps {
  isConnected: boolean
  systemInfo: SystemInfoType | null
  onFetchSystemInfo: () => void
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function SystemInfo({
  isConnected,
  systemInfo,
  onFetchSystemInfo,
}: SystemInfoProps) {
  const [uptime, setUptime] = useState(systemInfo?.uptime || 0)

  // Fetch system info periodically
  useEffect(() => {
    if (!isConnected) return

    onFetchSystemInfo()
    const interval = setInterval(onFetchSystemInfo, 5000)
    return () => clearInterval(interval)
  }, [isConnected, onFetchSystemInfo])

  // Increment uptime locally
  useEffect(() => {
    if (!isConnected || !systemInfo) return

    setUptime(systemInfo.uptime)
    const interval = setInterval(() => {
      setUptime((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isConnected, systemInfo])

  const heapPercentage = systemInfo
    ? (systemInfo.heap / 520000) * 100 // ESP32 typical max heap
    : 0

  const flashPercentage = systemInfo
    ? ((systemInfo.flash - systemInfo.heap) / systemInfo.flash) * 100
    : 0

  return (
    <div className={`scanline-overlay rounded-lg border border-primary/30 bg-card p-4 transition-glow hover:border-primary/50 ${!isConnected ? 'offline-overlay' : ''}`}>
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-primary">
            ESP32 Status
          </h2>
        </div>

        {systemInfo ? (
          <div className="space-y-4">
            {/* Uptime */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">UPTIME</span>
              </div>
              <span className="font-mono text-sm text-primary tabular-nums">
                {formatUptime(uptime)}
              </span>
            </div>

            {/* Free Heap */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">FREE HEAP</span>
                </div>
                <span className="font-mono text-xs text-foreground">
                  {formatBytes(systemInfo.heap)}
                </span>
              </div>
              <Progress
                value={heapPercentage}
                className="h-2 bg-muted"
              />
            </div>

            {/* Flash Memory */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">FLASH</span>
                </div>
                <span className="font-mono text-xs text-foreground">
                  {formatBytes(systemInfo.flash)}
                </span>
              </div>
              <Progress
                value={flashPercentage}
                className="h-2 bg-muted"
              />
            </div>

            {/* Temperature (if available) */}
            {systemInfo.temp && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">CPU TEMP</span>
                </div>
                <span
                  className={`font-mono text-sm ${
                    systemInfo.temp > 70
                      ? 'text-destructive'
                      : systemInfo.temp > 50
                      ? 'text-warning'
                      : 'text-success'
                  }`}
                >
                  {systemInfo.temp}°C
                </span>
              </div>
            )}

            {/* WiFi Info */}
            <div className="space-y-2 border-t border-border/50 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">SSID</span>
                </div>
                <span className="font-mono text-xs text-foreground">
                  {systemInfo.ssid}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">RSSI</span>
                </div>
                <span
                  className={`font-mono text-xs ${
                    systemInfo.rssi > -50
                      ? 'text-success'
                      : systemInfo.rssi > -70
                      ? 'text-warning'
                      : 'text-destructive'
                  }`}
                >
                  {systemInfo.rssi} dBm
                </span>
              </div>
            </div>

            {/* Device Info */}
            <div className="space-y-2 border-t border-border/50 pt-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">MAC</span>
                <span className="font-mono text-[10px] text-foreground">
                  {systemInfo.mac}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">CLIENTS</span>
                </div>
                <span className="font-mono text-xs text-foreground">
                  {systemInfo.clients}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">FIRMWARE</span>
                <span className="font-mono text-xs text-primary">
                  v{systemInfo.version}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-40 flex-col items-center justify-center gap-2">
            <Cpu className="h-8 w-8 text-muted-foreground/50" />
            <span className="font-mono text-xs text-muted-foreground">
              {isConnected ? 'Loading...' : 'Not connected'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
