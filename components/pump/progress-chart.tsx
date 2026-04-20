'use client'

import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
import type { ProgressDataPoint } from '@/lib/pump-types'

interface ProgressChartProps {
  data: ProgressDataPoint[]
}

export function ProgressChart({ data }: ProgressChartProps) {
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
          <TrendingUp className="h-5 w-5" />
          Bieu do tien trinh
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length < 2 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Bieu do se hien thi khi bat dau bom
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="timeLabel" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  className="text-muted-foreground"
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                  unit="%"
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'progress') return [`${value}%`, 'Tien trinh']
                    if (name === 'volume') return [`${value} ml`, 'Da bom']
                    return [value, name]
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="progress" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary)/0.2)" 
                  strokeWidth={2}
                  name="progress"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
