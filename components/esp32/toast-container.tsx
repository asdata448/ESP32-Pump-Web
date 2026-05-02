'use client'

import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import type { ToastMessage } from '@/lib/types'

interface ToastContainerProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'border-success/50 bg-success/10 text-success',
  error: 'border-destructive/50 bg-destructive/10 text-destructive',
  warning: 'border-warning/50 bg-warning/10 text-warning',
  info: 'border-primary/50 bg-primary/10 text-primary',
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = icons[toast.type]
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 ${colors[toast.type]}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="font-mono text-xs">{toast.message}</span>
            <button
              onClick={() => onRemove(toast.id)}
              className="ml-2 rounded p-1 hover:bg-white/10"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
