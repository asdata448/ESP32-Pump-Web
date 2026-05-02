'use client'

import { Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import type { FSRDataPoint, PumpStatus } from '@/lib/pump-types'

interface FSRChartProps {
  data: FSRDataPoint[]
  status: PumpStatus
}

export function FSRChart({ data, status }: FSRChartProps) {
  // Format time for display
  const formattedData = data.map(point => ({
    ...point,
    timeLabel: new Date(point.time).toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Bieu do FSR theo thoi gian
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length < 2 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Dang thu thap du lieu...
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="timeLabel" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  className="text-muted-foreground"
                />
                <YAxis 
                  domain={[0, Math.max(status.fsr_occlusion_threshold * 1.2, 2500)]}
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                {/* Presence threshold line */}
                <ReferenceLine 
                  y={status.fsr_presence_threshold} 
                  stroke="hsl(var(--warning))" 
                  strokeDasharray="5 5"
                  label={{ 
                    value: 'Tiep xuc', 
                    position: 'right',
                    fill: 'hsl(var(--warning))',
                    fontSize: 10
                  }}
                />
                {/* Occlusion threshold line */}
                <ReferenceLine 
                  y={status.fsr_occlusion_threshold} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5"
                  label={{ 
                    value: 'Nghen', 
                    position: 'right',
                    fill: 'hsl(var(--destructive))',
                    fontSize: 10
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  name="FSR"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
