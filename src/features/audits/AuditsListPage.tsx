import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { AuditStatusBadge } from "@/components/common/StatusBadge";
import { hasPermission } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { useAuditsQuery } from "@/features/audits/api";
import { CreateAuditDialog } from "@/features/audits/components/CreateAuditDialog";
import { useAuthStore } from "@/store/auth.store";

/**
 * Audit assign -> scan -> submit -> verify workflow (plan §D). This is the org-wide list; the
 * per-audit workflow (assign / scan / submit / verify screens, role-scoped) lives at
 * AuditDetailPage (`/audits/:id`).
 */
export function AuditsListPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const canAssign = hasPermission(currentUser?.role, "canAssignAudits");
  const { data: audits, isLoading } = useAuditsQuery();

  return (
    <div>
      <PageHeader
        title="Inventory Audits"
        description="Assign, scan and verify physical asset counts."
        actions={canAssign && <CreateAuditDialog />}
      />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : audits && audits.length > 0 ? (
        <Card className="p-0">
          <div className="divide-y divide-border">
            {audits.map((audit) => (
              <Link
                key={audit.id}
                to={`/audits/${audit.id}`}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{audit.name}</p>
                    <AuditStatusBadge status={audit.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {audit.code} · Assigned to {audit.assignedToName ?? (audit.assignedTo ? "a team member" : "nobody yet")} ·{" "}
                    {formatDate(audit.assignedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs sm:gap-6">
                  <div className="text-center">
                    <p className="font-semibold text-foreground">
                      {audit.totalScanned}/{audit.totalExpected}
                    </p>
                    <p className="text-muted-foreground">Scanned</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-emerald-400">{audit.totalMatched}</p>
                    <p className="text-muted-foreground">Matched</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-rose-400">{audit.totalMissing}</p>
                    <p className="text-muted-foreground">Missing</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
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
