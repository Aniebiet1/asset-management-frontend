import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ColumnDatum {
  key: string;
  /** Short axis label (e.g. "May"). */
  label: string;
  /** Longer label shown in the hover readout (e.g. "May 2026"). */
  tooltipLabel?: string;
  value: number;
}

interface ColumnChartProps {
  data: ColumnDatum[];
  /** Series name for the tooltip; a single series needs no legend, the card title names it. */
  seriesName: string;
  height?: number;
}

interface ValuePillProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  value?: unknown;
  index?: number;
}

/**
 * Single-series column chart. Every column is a soft tint of the series color except the focused
 * one (the latest period, or whichever the pointer is over), which goes full strength and carries
 * its value in a pill above it. That focus is the hover readout, so there is no floating tooltip
 * box covering the columns.
 */
export function ColumnChart({ data, seriesName, height = 240 }: ColumnChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const focusIndex = hoverIndex ?? data.length - 1;

  const renderValuePill = ({ x, y, width, value, index }: ValuePillProps) => {
    if (index !== focusIndex) return null;
    const text = Number(value ?? 0).toLocaleString();
    const pillWidth = Math.max(28, text.length * 7 + 16);
    const cx = Number(x) + Number(width) / 2;
    const top = Number(y) - 30;
    return (
      <g pointerEvents="none">
        <rect x={cx - pillWidth / 2} y={top} width={pillWidth} height={22} rx={11} fill="var(--foreground)" />
        <text x={cx} y={top + 15} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--background)">
          {text}
        </text>
      </g>
    );
  };

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 36, right: 4, left: 0, bottom: 0 }}
          onMouseMove={(state) => {
            const idx = state?.activeTooltipIndex;
            setHoverIndex(idx == null ? null : Number(idx));
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            interval="preserveStartEnd"
          />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={32} tickCount={4} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <Tooltip cursor={{ fill: "var(--viz-grid)", radius: 8 }} content={() => null} />
          <Bar dataKey="value" name={seriesName} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={d.key} fill={i === focusIndex ? "var(--viz-series)" : "var(--viz-bar-soft)"} className="transition-[fill] duration-150" />
            ))}
            <LabelList dataKey="value" content={renderValuePill} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
