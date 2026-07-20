import { TrendingDown, TrendingUp, Minus, ShieldCheck, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface DailyAnalysis {
  completenessPct: number | null
  specificYield: number | null
  peerMedianYield: number | null
  performanceIndex: number | null
  maxStringDevPct: number | null
  flags: string[]
  date: Date
}
interface Baseline {
  stringIndex: number
  medianShare: number
  sampleCount: number
}

// Machine flag → Uzbek label + severity tint.
function flagLabel(flag: string): { text: string; tone: "warn" | "crit" | "muted" } {
  if (flag.startsWith("FUSE:")) {
    const [, idx, sig] = flag.split(":")
    return sig === "OPEN"
      ? { text: `String ${idx}: uzilgan (fuse ehtimoli)`, tone: "crit" }
      : { text: `String ${idx}: tok yarmiga tushdi`, tone: "warn" }
  }
  if (flag.startsWith("STRING_IMBALANCE:")) {
    return { text: `String ${flag.split(":")[1]} nomutanosib`, tone: "warn" }
  }
  if (flag === "LOW_YIELD") return { text: "Hududdan past ishlab chiqarish", tone: "warn" }
  if (flag === "LOW_COMPLETENESS") return { text: "Ma'lumot to'liq emas", tone: "muted" }
  return { text: flag, tone: "muted" }
}

function Mini({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-neutral-100 p-3 dark:border-neutral-800">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm font-semibold tabular-nums">
        {value}
        {unit && value !== "—" && <span className="text-muted-foreground ml-1 text-xs font-normal">{unit}</span>}
      </span>
      {hint && <span className="text-muted-foreground text-[11px]">{hint}</span>}
    </div>
  )
}

export function DeviceAnalysis({
  latest,
  baselines,
  trendSlope,
  historyDays,
}: {
  latest: DailyAnalysis | null
  baselines: Baseline[]
  trendSlope: number | null
  historyDays: number
}) {
  if (!latest) {
    return (
      <section className="flex flex-col gap-2 rounded-lg border border-neutral-100 bg-card p-5 dark:border-neutral-800">
        <h2 className="text-sm font-semibold tracking-tight">Tahlil</h2>
        <p className="text-muted-foreground text-sm">
          Kunlik tahlil hali yo&apos;q — birinchi natija bugungi quyosh botganda yaratiladi.
        </p>
      </section>
    )
  }

  const perfPct = latest.performanceIndex != null ? Math.round(latest.performanceIndex * 100) : null
  const realFlags = latest.flags.filter((f) => f !== "LOW_COMPLETENESS")
  const healthy = realFlags.length === 0

  const Trend =
    trendSlope == null ? null : trendSlope < -0.003 ? TrendingDown : trendSlope > 0.003 ? TrendingUp : Minus
  const trendText =
    trendSlope == null
      ? `Trend uchun ko'proq kun kerak (${historyDays}/5)`
      : trendSlope < -0.003
        ? "Sekin pasayish (ifloslanish/degradatsiya ehtimoli)"
        : trendSlope > 0.003
          ? "Yaxshilanish"
          : "Barqaror"

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-neutral-100 bg-card p-5 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold tracking-tight">Tahlil</h2>
          <p className="text-muted-foreground text-xs">
            Oxirgi kunlik tahlil ·{" "}
            {new Date(latest.date).toLocaleDateString("uz-UZ", { day: "numeric", month: "long" })}
          </p>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            healthy
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          )}
        >
          {healthy ? <ShieldCheck className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
          {healthy ? "Muammo yo'q" : `${realFlags.length} ta belgi`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini
          label="Ma'lumot to'liqligi"
          value={latest.completenessPct != null ? latest.completenessPct.toFixed(0) : "—"}
          unit="%"
        />
        <Mini
          label="Solishtirma unum"
          value={latest.specificYield != null ? latest.specificYield.toFixed(2) : "—"}
          unit="kWh/kWp"
        />
        <Mini
          label="Hududga nisbatan"
          value={perfPct != null ? String(perfPct) : "—"}
          unit="%"
          hint={latest.peerMedianYield != null ? `o'rtacha: ${latest.peerMedianYield.toFixed(2)}` : undefined}
        />
        <Mini
          label="Eng katta string og'ishi"
          value={latest.maxStringDevPct != null ? latest.maxStringDevPct.toFixed(0) : "—"}
          unit="%"
        />
      </div>

      {Trend && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Trend className={cn("size-4", trendSlope! < -0.003 && "text-amber-500", trendSlope! > 0.003 && "text-emerald-500")} />
          {trendText}
        </div>
      )}
      {!Trend && <p className="text-muted-foreground text-xs">{trendText}</p>}

      {realFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {realFlags.map((f) => {
            const { text, tone } = flagLabel(f)
            return (
              <span
                key={f}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium",
                  tone === "crit" && "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
                  tone === "warn" && "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
                  tone === "muted" && "bg-muted text-muted-foreground"
                )}
              >
                {text}
              </span>
            )
          })}
        </div>
      )}

      {baselines.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
          <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            String baseline (o&apos;rganilgan norma)
          </p>
          <div className="flex flex-wrap gap-2">
            {baselines.map((b) => (
              <span key={b.stringIndex} className="text-muted-foreground text-xs tabular-nums">
                String {b.stringIndex}: <span className="text-foreground font-medium">{b.medianShare.toFixed(2)}×</span>
                {b.sampleCount < 20 && <span className="text-amber-500"> (o&apos;rganilmoqda)</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
