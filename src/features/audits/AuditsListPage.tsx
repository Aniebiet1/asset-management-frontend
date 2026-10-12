import { Link } from "react-router-dom";
import { ClipboardCheck, ClipboardList, Hourglass, ScanLine, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { AuditStatusBadge } from "@/components/common/StatusBadge";
import { IconTile, Meter, StatTile } from "@/components/common/DashboardCard";
import { hasPermission } from "@/lib/permissions";
import { formatDate, getInitials } from "@/lib/format";
import { useAuditsQuery } from "@/features/audits/api";
import { CreateAuditDialog } from "@/features/audits/components/CreateAuditDialog";
import { useAuthStore } from "@/store/auth.store";

const OPEN_STATUSES = new Set(["draft", "assigned", "in_progress"]);

/**
 * Audit assign -> scan -> submit -> verify workflow (plan §D). This is the org-wide list; the
 * per-audit workflow (assign / scan / submit / verify screens, role-scoped) lives at
 * AuditDetailPage (`/audits/:id`).
 */
export function AuditsListPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const canAssign = hasPermission(currentUser?.role, "canAssignAudits");
  const { data: audits, isLoading } = useAuditsQuery();

  const all = audits ?? [];
  const openCount = all.filter((a) => OPEN_STATUSES.has(a.status)).length;
  const awaitingCount = all.filter((a) => a.status === "submitted").length;
  const verifiedCount = all.filter((a) => a.status === "verified").length;
  const tileValue = (n: number) => (isLoading ? "-" : n);

  return (
    <div>
      <PageHeader
        title="Inventory Audits"
        description="Assign, scan and verify physical asset counts."
        actions={canAssign && <CreateAuditDialog />}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-5 sm:grid-cols-3 sm:gap-4">
        <StatTile label="Open audits" value={tileValue(openCount)} icon={ScanLine} />
        <StatTile
          label="Awaiting verification"
          value={tileValue(awaitingCount)}
          icon={Hourglass}
          tone={awaitingCount > 0 ? "warning" : "brand"}
        />
        <div className="col-span-2 sm:col-span-1">
          <StatTile label="Verified" value={tileValue(verifiedCount)} icon={ShieldCheck} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : all.length > 0 ? (
        <Card className="gap-0 p-0 ring-foreground/[0.06]">
          <div className="divide-y divide-border">
            {all.map((audit) => {
              const progress = audit.totalExpected > 0 ? (audit.totalScanned / audit.totalExpected) * 100 : 0;
              return (
                <Link
                  key={audit.id}
                  to={`/audits/${audit.id}`}
                  className="grid grid-cols-1 gap-4 p-4 transition-colors hover:bg-muted/40 sm:px-5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] md:items-center md:gap-6"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <IconTile icon={ClipboardCheck} tone={audit.status === "verified" ? "neutral" : "brand"} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-foreground">{audit.name}</p>
                        <AuditStatusBadge status={audit.status} />
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        <span className="font-mono">{audit.code}</span>
                        {audit.assignedAt ? ` · ${formatDate(audit.assignedAt)}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {audit.totalScanned}/{audit.totalExpected}
                        </span>{" "}
                        scanned
                      </span>
                      <span className="tabular-nums">
                        <span className="text-emerald-600 dark:text-emerald-400">{audit.totalMatched} matched</span>
                        {audit.totalMissing > 0 && <span className="text-rose-600 dark:text-rose-400"> · {audit.totalMissing} missing</span>}
                      </span>
                    </div>
                    <Meter percent={progress} tone={audit.totalMissing > 0 ? "warning" : "brand"} />
                  </div>

                  <div className="flex items-center gap-2 text-[13px] md:justify-end">
                    {audit.assignedToName ? (
                      <>
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[10px] font-semibold text-brand-link">
                          {getInitials(audit.assignedToName)}
                        </span>
                        <span className="truncate text-foreground">{audit.assignedToName}</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">{audit.assignedTo ? "Assigned to a team member" : "Not assigned yet"}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <ClipboardList className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No audits yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {canAssign ? "Create your first audit to start a physical asset count." : "No inventory audits have been created yet."}
          </p>
        </div>
      )}
    </div>
  );
}
