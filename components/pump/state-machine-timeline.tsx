'use client'

import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PumpState } from '@/lib/pump-types'
import { PUMP_STATES, STATE_LABELS } from '@/lib/pump-types'

interface StateMachineTimelineProps {
  currentState: PumpState
}

export function StateMachineTimeline({ currentState }: StateMachineTimelineProps) {
  const currentIndex = PUMP_STATES.indexOf(currentState)
  const isError = currentState === 'ERROR'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quy trình hoạt động</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
          
          {/* Steps */}
          <div className="space-y-3">
            {PUMP_STATES.map((state, index) => {
              const isCompleted = index < currentIndex && !isError
              const isCurrent = state === currentState || (isError && index === currentIndex)
              const isPending = index > currentIndex || isError

              return (
                <div 
                  key={state}
                  className={`relative flex items-center gap-3 pl-8 ${
                    isCurrent ? 'text-primary font-medium' : 
                    isCompleted ? 'text-success' : 
                    'text-muted-foreground'
                  }`}
                >
                  {/* Icon */}
                  <div className="absolute left-0 flex items-center justify-center w-6 h-6 bg-background">
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : isCurrent ? (
                      <Loader2 className={`h-5 w-5 ${isError ? 'text-destructive' : 'text-primary'} animate-spin`} />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>

                  {/* Label */}
                  <span className={`text-sm ${
                    isCurrent && isError ? 'text-destructive' : ''
                  }`}>
                    {STATE_LABELS[state]}
                  </span>

                  {/* Current indicator */}
                  {isCurrent && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isError 
                        ? 'bg-destructive/10 text-destructive' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      Hiện tại
                    </span>
                  )}
                </div>
              )
            })}

            {/* Error state - show separately if in error */}
            {isError && (
              <div className="relative flex items-center gap-3 pl-8 text-destructive font-medium">
                <div className="absolute left-0 flex items-center justify-center w-6 h-6 bg-background">
                  <Loader2 className="h-5 w-5 text-destructive animate-spin" />
                </div>
                <span className="text-sm">{STATE_LABELS.ERROR}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                  Hien tai
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
