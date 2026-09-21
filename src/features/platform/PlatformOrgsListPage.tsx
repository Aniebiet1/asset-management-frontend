import { Link, useSearchParams } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { PlanStatusBadge } from "@/components/common/StatusBadge";
import { BrandedLoader } from "@/components/brand/BrandedLoader";
import { useFleetAnalyticsQuery, useOrgsQuery } from "./api";
import { matchesRiskFilter, parseRiskFilter, riskFilterLabels } from "./riskFilters";

export function PlatformOrgsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const riskFilter = parseRiskFilter(searchParams.get("risk"));
  const { data: allOrgs, isLoading } = useOrgsQuery();
  // Only the two asset-level filters actually need this, and the dashboard has usually already
  // warmed the cache by the time a tile is clicked.
  const { data: analytics } = useFleetAnalyticsQuery();

  const orgs = riskFilter ? allOrgs?.filter((org) => matchesRiskFilter(org, riskFilter, analytics)) : allOrgs;

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Every workspace Tecres has created for a customer."
        actions={
          <Button size="sm" className="gap-1.5" asChild>
            <Link to="/platform/orgs/new">
              <Plus className="size-3.5" />
              New Workspace
            </Link>
          </Button>
        }
      />

      {riskFilter && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtered by</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
            {riskFilterLabels[riskFilter]}
            <button
              type="button"
              onClick={() => setSearchParams({}, { replace: true })}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear filter"
            >
              <X className="size-3" />
            </button>
          </span>
        </div>
      )}

      {isLoading ? (
        <Card className="p-0">
          <div className="flex justify-center py-10">
            <BrandedLoader size="sm" />
          </div>
        </Card>
      ) : orgs?.length ? (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <Link to={`/platform/orgs/${org.id}`} className="block">
                        <p className="font-medium text-foreground">{org.name}</p>
                        <p className="text-xs text-muted-foreground">{org.slug}</p>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <PlanStatusBadge status={org.planStatus} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {org.userCount} / {org.userQuota}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {org.assetCount} / {org.assetQuota}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {org.lastActivityAt ? new Date(org.lastActivityAt).toLocaleDateString() : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {orgs.map((org) => (
              <Link key={org.id} to={`/platform/orgs/${org.id}`}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{org.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{org.slug}</p>
                      </div>
                      <PlanStatusBadge status={org.planStatus} className="shrink-0" />
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Users {org.userCount}/{org.userQuota}
                      </span>
                      <span>
                        Assets {org.assetCount}/{org.assetQuota}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last activity {org.lastActivityAt ? new Date(org.lastActivityAt).toLocaleDateString() : "-"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {riskFilter ? `No organizations match "${riskFilterLabels[riskFilter]}" right now.` : "No organizations yet."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
