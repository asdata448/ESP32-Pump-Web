'use client'

import { useState, useEffect, useRef } from 'react'
import { Activity, Terminal, Pause, Play, Trash2, Send, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { PinState } from '@/lib/types'

interface LiveMonitorProps {
  isConnected: boolean
  pinStates: Record<string, PinState>
  serialLog: string[]
  onSendCommand: (command: string) => Promise<boolean>
  onClearLog: () => void
  onFetchSerial: () => void
  refreshRate: number
  onRefreshRateChange: (rate: number) => void
}

export function LiveMonitor({
  isConnected,
  pinStates,
  serialLog,
  onSendCommand,
  onClearLog,
  onFetchSerial,
  refreshRate,
  onRefreshRateChange,
}: LiveMonitorProps) {
  const [isPaused, setIsPaused] = useState(false)
  const [command, setCommand] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Auto-scroll terminal
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [serialLog, autoScroll])

  // Fetch serial data periodically
  useEffect(() => {
    if (!isConnected || isPaused) return

    const interval = setInterval(() => {
      onFetchSerial()
    }, 1000)

    return () => clearInterval(interval)
  }, [isConnected, isPaused, onFetchSerial])

  const handleSendCommand = async () => {
    if (!command.trim() || !isConnected) return
    setIsSending(true)
    await onSendCommand(command)
    setCommand('')
    setIsSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendCommand()
    }
  }

  const pinStateArray = Object.entries(pinStates)
    .filter(([, state]) => state.mode !== 'input')
    .map(([id, state]) => ({ id, ...state }))

  return (
    <div className={`scanline-overlay h-full rounded-lg border border-primary/30 bg-card transition-glow hover:border-primary/50 ${!isConnected ? 'offline-overlay' : ''}`}>
      <div className="relative z-10 flex h-full flex-col">
        <Tabs defaultValue="pins" className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <h2 className="flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider text-primary">
              <Activity className="h-4 w-4" />
              Live Monitor
            </h2>
            <TabsList className="h-7 bg-background/50">
              <TabsTrigger
                value="pins"
                className="h-6 px-3 font-mono text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                PIN STATES
              </TabsTrigger>
              <TabsTrigger
                value="serial"
                className="h-6 px-3 font-mono text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                SERIAL
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Pin States Tab */}
          <TabsContent value="pins" className="flex-1 overflow-hidden p-4 pt-2">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                  REFRESH:
                </span>
                <Select
                  value={refreshRate.toString()}
                  onValueChange={(v) => onRefreshRateChange(parseInt(v))}
                >
                  <SelectTrigger className="h-6 w-20 font-mono text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="500">500ms</SelectItem>
                    <SelectItem value="1000">1s</SelectItem>
                    <SelectItem value="2000">2s</SelectItem>
                    <SelectItem value="5000">5s</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
                className="h-6 gap-1 font-mono text-[10px]"
              >
                {isPaused ? (
                  <>
                    <Play className="h-3 w-3" />
                    RESUME
                  </>
                ) : (
                  <>
                    <Pause className="h-3 w-3" />
                    PAUSE
                  </>
                )}
              </Button>
            </div>

            <div className="max-h-[300px] overflow-auto rounded border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-8 font-mono text-[10px] text-muted-foreground">
                      PIN
                    </TableHead>
                    <TableHead className="h-8 font-mono text-[10px] text-muted-foreground">
                      MODE
                    </TableHead>
                    <TableHead className="h-8 font-mono text-[10px] text-muted-foreground">
                      VALUE
                    </TableHead>
                    <TableHead className="h-8 font-mono text-[10px] text-muted-foreground">
                      UPDATED
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pinStateArray.length > 0 ? (
                    pinStateArray.map((state) => (
                      <TableRow key={state.id} className="hover:bg-primary/5">
                        <TableCell className="py-2 font-mono text-xs text-primary">
                          {state.id}
                        </TableCell>
                        <TableCell className="py-2 font-mono text-xs uppercase text-muted-foreground">
                          {state.mode}
                        </TableCell>
                        <TableCell className="py-2">
                          <span
                            className={`font-mono text-xs ${
                              state.value > 0 ? 'text-success' : 'text-muted-foreground'
                            }`}
                          >
                            {state.value}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 font-mono text-[10px] text-muted-foreground">
                          {state.lastUpdated
                            ? new Date(state.lastUpdated).toLocaleTimeString()
                            : '--:--:--'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center font-mono text-xs text-muted-foreground"
                      >
                        No pin states recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-2 font-mono text-[10px] text-muted-foreground">
              {pinStateArray.length} pins tracked
            </div>
          </TabsContent>

          {/* Serial Console Tab */}
          <TabsContent value="serial" className="flex flex-1 flex-col overflow-hidden p-4 pt-2">
            {/* Terminal Controls */}
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-3 w-3 text-success" />
                <span className="font-mono text-[10px] text-success">SERIAL CONSOLE</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`h-6 gap-1 font-mono text-[10px] ${
                    autoScroll ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <ArrowDown className="h-3 w-3" />
                  AUTO
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearLog}
                  className="h-6 gap-1 font-mono text-[10px] text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                  CLEAR
                </Button>
              </div>
            </div>

            {/* Terminal Output */}
            <div
              ref={terminalRef}
              className="flex-1 overflow-auto rounded border border-success/30 bg-black/50 p-3 font-mono text-xs"
              style={{ minHeight: '200px', maxHeight: '300px' }}
            >
              {serialLog.length > 0 ? (
                serialLog.map((line, i) => (
                  <div
                    key={i}
                    className={`leading-relaxed ${
                      line.startsWith('>') ? 'text-primary' : 'text-success'
                    }`}
                  >
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground terminal-cursor">
                  Waiting for data...
                </div>
              )}
            </div>

            {/* Command Input */}
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-success">
                  {'>'}
                </span>
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!isConnected || isSending}
                  placeholder="Enter command..."
                  className="h-8 border-success/30 bg-black/30 pl-6 font-mono text-xs text-success placeholder:text-success/50 focus-visible:ring-success/50"
                />
              </div>
              <Button
                onClick={handleSendCommand}
                disabled={!isConnected || isSending || !command.trim()}
                className="h-8 gap-1 bg-success font-mono text-xs text-success-foreground hover:bg-success/90"
              >
                <Send className="h-3 w-3" />
                SEND
              </Button>
            </div>

            <div className="mt-2 font-mono text-[10px] text-muted-foreground">
              {serialLog.length} lines
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
