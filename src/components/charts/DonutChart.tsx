import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "cn";
import { ChartTooltip } from "./ChartTooltip";

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  /** A fixed per-entity color (index.css --viz-*), never assigned by position. */
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
  emptyText?: string;
}

/**
 * Donut with its total in the middle and a labeled legend (count + share) beside it, or under it
 * when the card is narrow (container query, so it adapts to the card, not the viewport). The
 * legend always prints values: two of the status hues sit under 3:1 contrast on the light
 * surface, so identity and amount can't depend on reading the ring's color alone.
 */
export function DonutChart({ segments, centerValue, centerLabel, emptyText = "No data yet." }: DonutChartProps) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) return <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>;

  return (
    <div className="@container">
      <div className="flex flex-col items-center gap-5 @[22rem]:flex-row @[22rem]:gap-6">
        <div className="relative size-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={visible}
                dataKey="value"
                nameKey="label"
                innerRadius="70%"
                outerRadius="100%"
                stroke="var(--card)"
                strokeWidth={2}
                cornerRadius={4}
                startAngle={90}
                endAngle={-270}
                isAnimationActive={false}
                onMouseEnter={(_, index) => setHoverKey(visible[index]?.key ?? null)}
                onMouseLeave={() => setHoverKey(null)}
              >
                {visible.map((s) => (
                  <Cell key={s.key} fill={s.color} fillOpacity={hoverKey && hoverKey !== s.key ? 0.35 : 1} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{centerValue}</span>
            <span className="text-[11px] text-muted-foreground">{centerLabel}</span>
          </div>
        </div>

        <ul className="grid w-full flex-1 grid-cols-2 gap-x-4 gap-y-2.5 @[22rem]:grid-cols-1">
          {visible.map((s) => (
            <li
              key={s.key}
              onMouseEnter={() => setHoverKey(s.key)}
              onMouseLeave={() => setHoverKey(null)}
              className={cn("flex items-center gap-2 text-[13px] transition-opacity", hoverKey && hoverKey !== s.key && "opacity-50")}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.label}</span>
              <span className="font-semibold text-foreground tabular-nums">{s.value.toLocaleString()}</span>
              <span className="hidden w-9 text-right text-xs text-muted-foreground tabular-nums @[22rem]:inline">
                {Math.round((s.value / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
