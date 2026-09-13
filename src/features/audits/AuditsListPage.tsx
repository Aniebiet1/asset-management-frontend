import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { AuditStatusBadge } from "@/components/common/StatusBadge";
import { hasPermission } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { mockAudits } from "@/lib/mock-data";
import { useAuthStore } from "@/store/auth.store";

/**
 * Audit assign → scan → submit → verify workflow (plan §D). Phase 1: list view only,
 * with the assign/scan/verify role-specific screens (plan §J) to follow.
 */
export function AuditsListPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const canAssign = hasPermission(currentUser?.role, "canAssignAudits");

  return (
    <div>
      <PageHeader
        title="Inventory Audits"
        description="Assign, scan and verify physical asset counts."
        actions={
          canAssign && (
            <Button size="sm" className="gap-1.5">
              <Plus className="size-3.5" />
              New Audit
            </Button>
          )
        }
      />
      <div className="space-y-3">
        {mockAudits.map((audit) => (
          <Link key={audit.id} to={`/audits/${audit.id}`}>
            <Card className="transition-colors hover:border-input">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{audit.name}</p>
                    <AuditStatusBadge status={audit.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {audit.code} · Assigned to {audit.assignedToName ?? "—"} · {formatDate(audit.assignedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs sm:gap-6">
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{audit.totalScanned}/{audit.totalExpected}</p>
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
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
