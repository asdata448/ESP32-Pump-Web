'use client'

import { Wifi, Settings } from 'lucide-react'
import type { PumpStatus } from '@/lib/pump-types'

interface MedicalHeaderProps {
  status: PumpStatus
  isConnected: boolean
  isDemo: boolean
  onSettingsClick: () => void
}

export function MedicalHeader({ 
  status, 
  isConnected, 
  isDemo,
  onSettingsClick 
}: MedicalHeaderProps) {
  return (
    <header className="header-gradient sticky top-0 z-50 px-4 py-4 mb-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Left - Title */}
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-white tracking-wide uppercase">
            May Bom Tiem Dien
          </h1>
          <span className="text-sm text-muted-foreground">
            Giam sat & dieu khien
          </span>
        </div>

        {/* Right - WiFi, Status & Settings */}
        <div className="flex items-center gap-4">
          {/* WiFi Icon */}
          <Wifi className="h-6 w-6 wifi-icon" />
          
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`status-dot ${isConnected ? 'status-dot-online' : 'status-dot-offline'}`} />
            <span className={`text-sm font-medium ${isConnected ? 'text-success' : 'text-destructive'}`}>
              {isDemo ? 'Demo' : isConnected ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Settings Button */}
          <button 
            onClick={onSettingsClick}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Cai dat"
          >
            <Settings className="h-5 w-5 text-muted-foreground hover:text-white transition-colors" />
          </button>
        </div>
      </div>

      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="max-w-6xl mx-auto mt-3">
          <div className="bg-warning/15 border border-warning/25 rounded-lg px-4 py-2 text-sm text-warning text-center">
            <span className="font-semibold">CHE DO DEMO</span> - Du lieu mo phong, khong ket noi ESP32
          </div>
        </div>
      )}
    </header>
  )
}
