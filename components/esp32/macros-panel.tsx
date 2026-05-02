'use client'

import { useState } from 'react'
import { Play, Plus, AlertTriangle, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { DEFAULT_MACROS, type Macro } from '@/lib/types'

interface MacrosPanelProps {
  isConnected: boolean
  onExecuteMacro: (macro: Macro) => Promise<boolean>
}

export function MacrosPanel({ isConnected, onExecuteMacro }: MacrosPanelProps) {
  const [macros, setMacros] = useState<Macro[]>(DEFAULT_MACROS)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [lastExecuted, setLastExecuted] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newMacro, setNewMacro] = useState({
    name: '',
    method: 'POST' as const,
    endpoint: '/api/macro',
    body: '',
  })

  const handleExecute = async (macro: Macro) => {
    if (!isConnected || executingId) return
    setExecutingId(macro.id)
    await onExecuteMacro(macro)
    setLastExecuted(new Date().toISOString())
    setExecutingId(null)
  }

  const handleAddMacro = () => {
    if (!newMacro.name.trim() || !newMacro.endpoint.trim()) return

    let body: Record<string, unknown> | undefined
    if (newMacro.body.trim()) {
      try {
        body = JSON.parse(newMacro.body)
      } catch {
        return
      }
    }

    const macro: Macro = {
      id: Date.now().toString(),
      name: newMacro.name.toUpperCase(),
      action: 'custom',
      method: newMacro.method,
      endpoint: newMacro.endpoint,
      body,
    }

    setMacros([...macros, macro])
    setNewMacro({ name: '', method: 'POST', endpoint: '/api/macro', body: '' })
    setIsDialogOpen(false)
  }

  const handleRemoveMacro = (id: string) => {
    setMacros(macros.filter((m) => m.id !== id))
  }

  return (
    <div className={`scanline-overlay rounded-lg border border-primary/30 bg-card p-4 transition-glow hover:border-primary/50 ${!isConnected ? 'offline-overlay' : ''}`}>
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider text-primary">
            <Play className="h-4 w-4" />
            Macros
          </h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-6 gap-1 font-mono text-[10px]"
              >
                <Plus className="h-3 w-3" />
                ADD
              </Button>
            </DialogTrigger>
            <DialogContent className="border-primary/30 bg-card">
              <DialogHeader>
                <DialogTitle className="font-mono text-sm uppercase tracking-wider text-primary">
                  Add Custom Macro
                </DialogTitle>
              </DialogHeader>
              <FieldGroup className="space-y-4">
                <Field>
                  <FieldLabel className="font-mono text-xs text-muted-foreground">
                    NAME
                  </FieldLabel>
                  <Input
                    value={newMacro.name}
                    onChange={(e) => setNewMacro({ ...newMacro, name: e.target.value })}
                    placeholder="MY MACRO"
                    className="font-mono text-sm uppercase"
                  />
                </Field>
                <Field>
                  <FieldLabel className="font-mono text-xs text-muted-foreground">
                    METHOD
                  </FieldLabel>
                  <Select
                    value={newMacro.method}
                    onValueChange={(v) => setNewMacro({ ...newMacro, method: v as 'GET' | 'POST' })}
                  >
                    <SelectTrigger className="font-mono text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel className="font-mono text-xs text-muted-foreground">
                    ENDPOINT
                  </FieldLabel>
                  <Input
                    value={newMacro.endpoint}
                    onChange={(e) => setNewMacro({ ...newMacro, endpoint: e.target.value })}
                    placeholder="/api/macro"
                    className="font-mono text-sm"
                  />
                </Field>
                <Field>
                  <FieldLabel className="font-mono text-xs text-muted-foreground">
                    JSON BODY (OPTIONAL)
                  </FieldLabel>
                  <Textarea
                    value={newMacro.body}
                    onChange={(e) => setNewMacro({ ...newMacro, body: e.target.value })}
                    placeholder='{"action": "custom"}'
                    className="min-h-[80px] font-mono text-sm"
                  />
                </Field>
                <Button
                  onClick={handleAddMacro}
                  className="w-full gap-2 bg-primary font-mono text-xs uppercase tracking-wider text-primary-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Add Macro
                </Button>
              </FieldGroup>
            </DialogContent>
          </Dialog>
        </div>

        {/* Macro Grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {macros.map((macro) => (
            <div key={macro.id} className="relative group">
              <Button
                onClick={() => handleExecute(macro)}
                disabled={!isConnected || executingId !== null}
                className={`h-auto w-full flex-col gap-1 py-3 font-mono text-[10px] uppercase tracking-wider transition-all ${
                  macro.isEmergency
                    ? 'border-destructive bg-destructive/20 text-destructive hover:bg-destructive/30 hover:text-destructive'
                    : 'border-primary/30 bg-card hover:border-primary hover:bg-primary/10'
                } ${executingId === macro.id ? 'scale-95' : ''}`}
                variant="outline"
              >
                {macro.isEmergency && (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span className="text-center leading-tight">{macro.name}</span>
                {executingId === macro.id && (
                  <div className="h-1 w-8 animate-pulse rounded bg-current" />
                )}
              </Button>
              {/* Remove button for custom macros */}
              {!DEFAULT_MACROS.find((m) => m.id === macro.id) && (
                <button
                  onClick={() => handleRemoveMacro(macro.id)}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Last Executed */}
        {lastExecuted && (
          <div className="mt-4 flex items-center justify-center gap-2 font-mono text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last: {new Date(lastExecuted).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
}
