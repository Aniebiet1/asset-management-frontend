export interface RankedBarDatum {
  key: string;
  label: string;
  value: number;
}

interface RankedBarsProps {
  data: RankedBarDatum[];
  /** Rows past this fold into a single "Other" row rather than getting their own bar. */
  maxRows?: number;
  emptyText?: string;
}

/**
 * Horizontal bars ranked largest first, drawn as plain HTML: the category name sits above its bar,
 * so long names never collide with an axis and the layout is identical on a phone. Single series,
 * so every bar is the brand color and the value is printed at the end of the row.
 */
export function RankedBars({ data, maxRows = 6, emptyText = "Nothing to show yet." }: RankedBarsProps) {
  const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  if (sorted.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>;

  const rows =
    sorted.length > maxRows
      ? [
          ...sorted.slice(0, maxRows - 1),
          { key: "__other", label: `Other (${sorted.length - maxRows + 1})`, value: sorted.slice(maxRows - 1).reduce((sum, d) => sum + d.value, 0) },
        ]
      : sorted;
  const total = sorted.reduce((sum, d) => sum + d.value, 0);
  const max = Math.max(...rows.map((r) => r.value));

  return (
    <ul className="space-y-4">
      {rows.map((row) => {
        const share = Math.round((row.value / total) * 100);
        return (
          <li key={row.key} title={`${row.label}: ${row.value.toLocaleString()} (${share}%)`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate font-medium text-foreground">{row.label}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{row.value.toLocaleString()}</span>
                <span className="ml-1.5 text-xs">{share}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={row.key === "__other" ? "h-full rounded-full bg-muted-foreground/40" : "h-full rounded-full bg-primary"}
                style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
