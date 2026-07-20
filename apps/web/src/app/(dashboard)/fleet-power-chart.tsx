"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface FleetPoint {
  ts: string
  totalW: number
}

const chartConfig = {
  totalKw: {
    label: "Portfel quvvati",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function FleetPowerChart({ data }: { data: FleetPoint[] }) {
  const formatted = data.map((d) => ({
    time: new Date(d.ts).toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    totalKw: Math.round(d.totalW / 100) / 10,
  }))

  if (formatted.length === 0) {
    return (
      <p className="text-muted-foreground flex h-[260px] items-center justify-center text-sm">
        Hali ma&apos;lumot yig&apos;ilmagan
      </p>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <AreaChart data={formatted} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillFleet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-totalKw)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--color-totalKw)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          minTickGap={40}
          tickMargin={8}
          className="text-xs"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          className="text-xs"
          tickFormatter={(v: number) => `${v}`}
          label={undefined}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <span className="font-mono font-medium tabular-nums">{value} kW</span>
              )}
            />
          }
        />
        <Area
          dataKey="totalKw"
          type="monotone"
          fill="url(#fillFleet)"
          stroke="var(--color-totalKw)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
