import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "cn";
import { Card } from "@/components/ui/card";

interface DashboardCardProps {
  title: string;
  description?: string;
  /** Right side of the header: a "View all" link, a segmented control, etc. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function DashboardCard({ title, description, action, className, children }: DashboardCardProps) {
  return (
    <Card className={cn("gap-0 p-4 ring-foreground/[0.06] sm:p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function ViewAllLink({ to, label = "View all" }: { to: string; label?: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-opacity hover:opacity-90"
    >
      {label}
    </Link>
  );
}

type Tone = "brand" | "warning" | "critical" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  brand: "bg-primary/12 text-brand-link",
  warning: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  critical: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  neutral: "bg-muted text-muted-foreground",
};

export function IconTile({ icon: Icon, tone = "brand", className }: { icon: LucideIcon; tone?: Tone; className?: string }) {
  return (
    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", TONE_CLASSES[tone], className)}>
      <Icon className="size-[18px]" />
    </span>
  );
}

interface StatTileProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  href?: string;
  hint?: string;
}

/** KPI tile. Linked tiles lift slightly on hover and reveal an arrow, so it's clear they drill in. */
export function StatTile({ label, value, icon, tone = "brand", href, hint }: StatTileProps) {
  const body = (
    <Card className="h-full gap-0 p-4 ring-foreground/[0.06] transition-transform duration-200 group-hover:-translate-y-0.5 sm:p-5">
      <div className="flex items-start justify-between">
        <IconTile icon={icon} tone={tone} />
        {href && <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-[28px] sm:leading-9">{value}</p>
      <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{label}</p>
      {hint && <p className="mt-1 truncate text-[11px] text-muted-foreground/80">{hint}</p>}
    </Card>
  );
  return href ? (
    <Link to={href} className="group block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    <div className="group">{body}</div>
  );
}

/** Small icon + number + label pair, for secondary figures inside a card. */
export function MiniStat({
  icon,
  label,
  value,
  tone = "brand",
  title,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  tone?: Tone;
  /** Full value on hover, when `value` is abbreviated. */
  title?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl bg-muted/50 p-3" title={title}>
      <IconTile icon={icon} tone={tone} className="size-9" />
      <div className="min-w-0">
        <p className="truncate text-lg leading-tight font-semibold text-foreground tabular-nums">{value}</p>
        <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="max-w-full overflow-x-auto no-scrollbar">
      <div role="tablist" aria-label={ariaLabel} className="inline-flex gap-0.5 rounded-full bg-muted p-1">
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                isActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
              {option.count != null && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                    isActive ? "bg-primary/12 text-brand-link" : "bg-foreground/[0.06]"
                  )}
                >
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Thin progress meter with its percentage beside it. */
export function Meter({ percent, tone = "brand", label }: { percent: number; tone?: "brand" | "critical" | "warning"; label?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const fill = tone === "critical" ? "bg-rose-500" : tone === "warning" ? "bg-amber-500" : "bg-primary";
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        {/* Late/at-risk fills also carry a stripe texture, so they never read as the brand color
            (a red or amber brand would otherwise be indistinguishable from the warning state). */}
        <div
          className={cn("h-full rounded-full", fill)}
          style={{
            width: `${clamped}%`,
            backgroundImage: tone === "brand" ? undefined : "repeating-linear-gradient(135deg, rgb(255 255 255 / 0.4) 0 2px, transparent 2px 5px)",
          }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-medium text-muted-foreground tabular-nums">{label ?? `${Math.round(clamped)}%`}</span>
    </div>
  );
}
