"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface ReadingPoint {
  ts: string
  acPower: number | null
  batterySoc: number | null
}

const chartConfig = {
  acPower: {
    label: "Quvvat (W)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function ReadingChart({ data }: { data: ReadingPoint[] }) {
  const formatted = data.map((d) => ({
    ...d,
    time: new Date(d.ts).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
  }))

  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <AreaChart data={formatted} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillAcPower" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-acPower)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--color-acPower)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          minTickGap={32}
          tickMargin={8}
          className="text-xs"
        />
        <YAxis tickLine={false} axisLine={false} width={44} className="text-xs" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="acPower"
          type="monotone"
          fill="url(#fillAcPower)"
          stroke="var(--color-acPower)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
