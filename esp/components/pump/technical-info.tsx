'use client'

import { Wrench, Cpu } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CALIBRATION, GPIO_PINS, SYRINGE_SPECS } from '@/lib/pump-types'

export function TechnicalInfo() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wrench className="h-5 w-5" />
          Thong tin ky thuat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calibration */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Thong so dong co
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded bg-muted p-2">
              <span className="text-muted-foreground">Lead screw pitch</span>
              <p className="font-mono font-medium">{CALIBRATION.leadScrewPitch} mm/rev</p>
            </div>
            <div className="rounded bg-muted p-2">
              <span className="text-muted-foreground">Motor steps</span>
              <p className="font-mono font-medium">{CALIBRATION.motorStepsPerRev} steps/rev</p>
            </div>
            <div className="rounded bg-muted p-2">
              <span className="text-muted-foreground">Microstep</span>
              <p className="font-mono font-medium">1/{CALIBRATION.microstep}</p>
            </div>
            <div className="rounded bg-muted p-2">
              <span className="text-muted-foreground">Total steps</span>
              <p className="font-mono font-medium">{CALIBRATION.stepsPerRev} steps/rev</p>
            </div>
          </div>
        </div>

        {/* Syringe Specs */}
        <div>
          <h4 className="text-sm font-medium mb-2">Thong so ong tiem</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {SYRINGE_SPECS.map(spec => (
              <div key={spec.name} className="rounded bg-muted p-2">
                <span className="text-muted-foreground">{spec.name}</span>
                <p className="font-mono font-medium">{spec.mmPerMl} mm/ml</p>
              </div>
            ))}
          </div>
        </div>

        {/* GPIO Pins */}
        <div>
          <h4 className="text-sm font-medium mb-2">GPIO Pin mapping</h4>
          <div className="grid grid-cols-3 gap-1 text-xs font-mono">
            <div className="rounded bg-muted p-1.5 text-center">
              <span className="text-muted-foreground block text-[10px]">ENA</span>
              <span className="font-medium">GPIO{GPIO_PINS.ENA}</span>
            </div>
            <div className="rounded bg-muted p-1.5 text-center">
              <span className="text-muted-foreground block text-[10px]">DIR</span>
              <span className="font-medium">GPIO{GPIO_PINS.DIR}</span>
            </div>
            <div className="rounded bg-muted p-1.5 text-center">
              <span className="text-muted-foreground block text-[10px]">PUL</span>
              <span className="font-medium">GPIO{GPIO_PINS.PUL}</span>
            </div>
            <div className="rounded bg-muted p-1.5 text-center">
              <span className="text-muted-foreground block text-[10px]">BUZZER</span>
              <span className="font-medium">GPIO{GPIO_PINS.BUZZER}</span>
            </div>
            <div className="rounded bg-muted p-1.5 text-center">
              <span className="text-muted-foreground block text-[10px]">FSR</span>
              <span className="font-medium">GPIO{GPIO_PINS.FSR}</span>
            </div>
            <div className="rounded bg-muted p-1.5 text-center">
              <span className="text-muted-foreground block text-[10px]">LIMIT</span>
              <span className="font-medium">GPIO{GPIO_PINS.LIMIT}</span>
            </div>
          </div>
        </div>

        {/* TFT Pins */}
        <div>
          <h4 className="text-sm font-medium mb-2">TFT ILI9341 + XPT2046</h4>
          <div className="grid grid-cols-5 gap-1 text-xs font-mono">
            <div className="rounded bg-muted p-1.5 text-center">
              <span className="text-muted-foreground block text-[10px]">CS</span>
              <span className="font-medium">{GPIO_PINS.TFT_CS}</span>
            </div>
            <div className="rounded bg-muted p-1.5 text-center">
              <span className="text-muted-foreground block text-[10px]">DC</span>
              <span className="font-medium">{GPIO_PINS.TFT_DC}</span>
            </div>
            <div className="rounded bg-muted p-1.5 text-center">
              <span className="text-muted-foreground block text-[10px]">RST</span>
              <span className="font-medium">{GPIO_PINS.TFT_RST}</span>
            </div>
            <div className="rounded bg-muted p-1.5 text-center">
              <span className="text-muted-foreground block text-[10px]">T_CS</span>
              <span className="font-medium">{GPIO_PINS.T_CS}</span>
            </div>
            <div className="rounded bg-muted p-1.5 text-center">
              <span className="text-muted-foreground block text-[10px]">T_IRQ</span>
              <span className="font-medium">{GPIO_PINS.T_IRQ}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
