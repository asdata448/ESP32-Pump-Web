'use client'

import { useState } from 'react'
import { X, Wifi, WifiOff, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface ConnectionDialogProps {
  isOpen: boolean
  onClose: () => void
  baseUrl: string
  isConnected: boolean
  isDemo: boolean
  onConnect: (url: string) => Promise<boolean>
  onDisconnect: () => void
  onTest: (url: string) => Promise<boolean>
}

export function ConnectionDialog({
  isOpen,
  onClose,
  baseUrl,
  isConnected,
  isDemo,
  onConnect,
  onDisconnect,
  onTest
}: ConnectionDialogProps) {
  const [url, setUrl] = useState(baseUrl || 'http://192.168.4.1')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  if (!isOpen) return null

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await onTest(url)
      setTestResult(result)
    } catch {
      setTestResult(false)
    } finally {
      setIsTesting(false)
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const success = await onConnect(url)
      if (success) {
        onClose()
      }
    } catch {
      setTestResult(false)
    } finally {
      setIsConnecting(false)
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
          <h2 className="text-xl font-bold text-white">Ket noi ESP32</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Current Status */}
        <div className="medical-panel-inner p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected && !isDemo ? (
                <Wifi className="h-5 w-5 text-success" />
              ) : (
                <WifiOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <div className="text-sm font-medium text-white">
                  {isConnected && !isDemo ? 'Da ket noi' : 'Chua ket noi'}
                </div>
                {isConnected && !isDemo && (
                  <div className="text-xs text-muted-foreground">{baseUrl}</div>
                )}
                {isDemo && (
                  <div className="text-xs text-warning">Dang o che do Demo</div>
                )}
              </div>
            </div>
            {isConnected && !isDemo && (
              <div className="status-dot status-dot-online" />
            )}
          </div>
        </div>

        {/* URL Input */}
        <div className="mb-4">
          <label className="text-sm text-muted-foreground mb-2 block">
            Dia chi IP ESP32
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setTestResult(null)
            }}
            placeholder="http://192.168.4.1"
            className="w-full bg-input border border-border rounded-lg px-4 py-3 text-white font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="mt-1 text-xs text-muted-foreground">
            Mac dinh AP mode: http://192.168.4.1
          </div>
        </div>

        {/* Test Result */}
        {testResult !== null && (
          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
            testResult 
              ? 'bg-success/10 border border-success/20' 
              : 'bg-destructive/10 border border-destructive/20'
          }`}>
            {testResult ? (
              <>
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-sm text-success">Ket noi thanh cong!</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="text-sm text-destructive">Khong the ket noi. Kiem tra IP va WiFi.</span>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={isTesting || !url}
            className="btn-control btn-secondary flex-1"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Dang kiem tra...
              </>
            ) : (
              'Kiem tra ket noi'
            )}
          </button>
          
          {isConnected && !isDemo ? (
            <button
              onClick={() => {
                onDisconnect()
                setTestResult(null)
              }}
              className="btn-control btn-danger flex-1"
            >
              Ngat ket noi
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting || !url}
              className="btn-control btn-primary flex-1"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Dang ket noi...
                </>
              ) : (
                'Ket noi'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
