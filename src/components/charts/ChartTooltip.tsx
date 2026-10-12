interface TooltipEntry {
  name?: unknown;
  value?: unknown;
  color?: string;
  payload?: { fill?: string; color?: string; tooltipLabel?: string };
}

interface ChartTooltipProps {
  // Recharts clones this element with the live tooltip state, so these arrive at render time.
  active?: boolean;
  payload?: ReadonlyArray<TooltipEntry>;
  label?: unknown;
  formatValue?: (value: number) => string;
}

/** Shared recharts tooltip body: card surface, series swatch, value in text ink (never the series
 * color, which is for the mark alone). */
export function ChartTooltip({ active, payload, label, formatValue = (v) => v.toLocaleString() }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const heading = payload[0].payload?.tooltipLabel ?? (label != null ? String(label) : undefined);
  return (
    <div className="min-w-32 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      {heading && <p className="mb-1 font-medium text-muted-foreground">{heading}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: entry.payload?.color ?? entry.payload?.fill ?? entry.color }} />
            {String(entry.name ?? "")}
          </span>
          <span className="font-semibold text-foreground tabular-nums">{formatValue(Number(entry.value ?? 0))}</span>
        </div>
      ))}
    </div>
  );
}
