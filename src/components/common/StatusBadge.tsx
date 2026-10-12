import { statusColorMap, conditionColorMap, auditStatusColorMap, auditItemStatusColorMap, maintenanceStatusColorMap, planStatusColorMap, priorityColorMap, alertSeverityColorMap, type StatusVisual } from "@/lib/status";
import { cn } from "cn";

function Dot({ visual, status, className }: { visual: Record<string, StatusVisual>; status: string; className?: string }) {
  const info = visual[status] ?? { bg: "bg-muted", text: "text-muted-foreground", border: "ring-border", label: status };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        info.bg,
        info.text,
        info.border,
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {info.label}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return <Dot visual={statusColorMap} status={status} className={className} />;
}

export function ConditionBadge({ condition, className }: { condition: string; className?: string }) {
  return <Dot visual={conditionColorMap} status={condition} className={className} />;
}

export function AuditStatusBadge({ status, className }: { status: string; className?: string }) {
  return <Dot visual={auditStatusColorMap} status={status} className={className} />;
}

export function AuditItemStatusBadge({ status, className }: { status: string; className?: string }) {
  return <Dot visual={auditItemStatusColorMap} status={status} className={className} />;
}

export function MaintenanceStatusBadge({ status, className }: { status: string; className?: string }) {
  return <Dot visual={maintenanceStatusColorMap} status={status} className={className} />;
}

export function PlanStatusBadge({ status, className }: { status: string; className?: string }) {
  return <Dot visual={planStatusColorMap} status={status} className={className} />;
}

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  return <Dot visual={priorityColorMap} status={priority} className={className} />;
}

export function AlertSeverityBadge({ severity, className }: { severity: string; className?: string }) {
  return <Dot visual={alertSeverityColorMap} status={severity} className={className} />;
}
