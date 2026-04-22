'use client'

import { useState } from 'react'
import { Wifi, RefreshCw, Check, X, Unplug } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ConnectionSettingsProps {
  baseUrl: string
  isConnected: boolean
  isDemo: boolean
  onConnect: (url: string) => Promise<boolean>
  onDisconnect: () => void
  onTest: (url: string) => Promise<boolean>
}

export function ConnectionSettings({
  baseUrl,
  isConnected,
  isDemo,
  onConnect,
  onDisconnect,
  onTest,
}: ConnectionSettingsProps) {
  const [url, setUrl] = useState(baseUrl || 'http://192.168.4.1')
  const [isTesting, setIsTesting] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await onTest(url)
      setTestResult(result)
    } finally {
      setIsTesting(false)
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      await onConnect(url)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wifi className="h-5 w-5" />
              Cài đặt kết nối
            </CardTitle>
            <CardDescription>
              Cấu hình địa chỉ IP của ESP32
            </CardDescription>
          </div>
          {isDemo ? (
            <Badge variant="outline" className="border-warning text-warning-foreground">
              Demo
            </Badge>
          ) : isConnected ? (
            <Badge className="bg-success text-success-foreground">
              Đã kết nối
            </Badge>
          ) : (
            <Badge variant="destructive">
              Mất kết nối
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="http://192.168.4.1"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setTestResult(null)
            }}
            className="font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={isTesting || !url}
          >
            {isTesting ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : testResult === true ? (
              <Check className="mr-2 h-4 w-4 text-success" />
            ) : testResult === false ? (
              <X className="mr-2 h-4 w-4 text-destructive" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Kiểm tra
          </Button>

          {isDemo ? (
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={isConnecting || !url}
            >
              {isConnecting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wifi className="mr-2 h-4 w-4" />
              )}
              Kết nối ESP32
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDisconnect}
            >
              <Unplug className="mr-2 h-4 w-4" />
              Ngắt kết nối
            </Button>
          )}
        </div>

        {testResult !== null && (
          <p className={`text-sm ${testResult ? 'text-success' : 'text-destructive'}`}>
            {testResult
              ? 'Kết nối thành công! Thiết bị đang trực tuyến.'
              : 'Không thể kết nối. Vui lòng kiểm tra địa chỉ IP và đảm bảo ESP32 đang hoạt động.'}
          </p>
        )}

        <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          <p className="font-medium mb-1">Hướng dẫn:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Kết nối điện thoại/máy tính vào WiFi của ESP32</li>
            <li>Mặc định IP là 192.168.4.1 khi ở chế độ AP</li>
            <li>Nếu ESP32 kết nối vào WiFi nhà, sử dụng IP được cấp</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
