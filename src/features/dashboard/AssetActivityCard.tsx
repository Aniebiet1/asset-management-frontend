import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardCard, Meter, SegmentedControl, ViewAllLink } from "@/components/common/DashboardCard";
import { MaintenanceStatusBadge } from "@/components/common/StatusBadge";
import { BrandedLoader } from "@/components/brand/BrandedLoader";
import { formatDate, getInitials } from "@/lib/format";
import { useAssetsByIdsQuery, useActiveAssignmentsQuery, usePeopleQuery } from "@/features/check-in-out/api";
import { loanStatus } from "@/features/check-in-out/loanStatus";
import type { MaintenanceRecord } from "@/types";

type Tab = "out" | "overdue" | "maintenance";
const ROW_LIMIT = 5;

interface AssetActivityCardProps {
  /** Assets already loaded by the dashboard, used before falling back to per-id fetches. */
  knownAssets: Map<string, { name: string; assetTag: string }>;
  upcomingMaintenance: MaintenanceRecord[];
  maintenanceLoading: boolean;
}

/** The dashboard's lead card: what is out, what is late, and what is in the shop, as one tabbed
 * table (stacked rows on phones). */
export function AssetActivityCard({ knownAssets, upcomingMaintenance, maintenanceLoading }: AssetActivityCardProps) {
  const [tab, setTab] = useState<Tab>("out");
  const { data: assignments, isLoading: assignmentsLoading } = useActiveAssignmentsQuery();
  // GET /assignments returns userId but not the person's name, so resolve it from the people list.
  const { data: people } = usePeopleQuery();
  const nameOf = (userId: string, fallback?: string) => people?.find((p) => p.id === userId)?.name ?? fallback ?? "Unknown";
  // Captured once per mount so the progress bars don't depend on render timing.
  const [now] = useState(() => Date.now());

  const overdueIds = useMemo(() => new Set((assignments?.overdue ?? []).map((a) => a.id)), [assignments]);
  const loans = useMemo(() => {
    const source = tab === "overdue" ? (assignments?.overdue ?? []) : (assignments?.active ?? []);
    return [...source]
      .sort((a, b) => new Date(a.expectedReturnDate ?? "9999").getTime() - new Date(b.expectedReturnDate ?? "9999").getTime())
      .slice(0, ROW_LIMIT);
  }, [assignments, tab]);
  const maintenanceRows = upcomingMaintenance.slice(0, ROW_LIMIT);

  const missingIds = (tab === "maintenance" ? maintenanceRows.map((m) => m.assetId) : loans.map((l) => l.assetId)).filter(
    (id) => !knownAssets.has(id)
  );
  const fetched = useAssetsByIdsQuery(missingIds);
  const assetLabel = (id: string, fallbackName?: string | null, fallbackTag?: string | null) => {
    const known = knownAssets.get(id) ?? fetched.byId.get(id);
    return { name: known?.name ?? fallbackName ?? "Unknown asset", tag: known?.assetTag ?? fallbackTag ?? "" };
  };

  const isLoading = tab === "maintenance" ? maintenanceLoading : assignmentsLoading;
  const isEmpty = tab === "maintenance" ? maintenanceRows.length === 0 : loans.length === 0;
  const emptyText = { out: "Nothing is checked out right now.", overdue: "No overdue returns. Nice.", maintenance: "No maintenance scheduled." }[tab];

  return (
    <DashboardCard
      title="Asset activity"
      description="What's out with people, what's late, and what's in for service."
      action={<ViewAllLink to={tab === "maintenance" ? "/maintenance" : "/check-in-out"} />}
    >
      <div className="mb-4">
        <SegmentedControl
          ariaLabel="Asset activity view"
          value={tab}
          onChange={setTab}
          options={[
            { value: "out", label: "Checked out", count: assignments?.active.length },
            { value: "overdue", label: "Overdue", count: assignments?.overdue.length },
            { value: "maintenance", label: "Maintenance", count: upcomingMaintenance.length },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <BrandedLoader size="sm" />
        </div>
      ) : isEmpty ? (
        <p className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">{emptyText}</p>
      ) : tab === "maintenance" ? (
        <>
          <table className="hidden w-full text-left text-[13px] md:table">
            <thead>
              <tr className="text-[11px] text-muted-foreground">
                <th className="pb-2.5 font-medium">Asset</th>
                <th className="pb-2.5 font-medium">Work</th>
                <th className="pb-2.5 font-medium">Scheduled</th>
                <th className="pb-2.5 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {maintenanceRows.map((m) => {
                const asset = assetLabel(m.assetId, m.assetName, m.assetTag);
                return (
                  <tr key={m.id} className="align-middle">
                    <td className="py-3 pr-3">
                      <AssetCell id={m.assetId} name={asset.name} tag={asset.tag} />
                    </td>
                    <td className="max-w-48 truncate py-3 pr-3 text-foreground">{m.title}</td>
                    <td className="py-3 pr-3 whitespace-nowrap text-muted-foreground">{formatDate(m.scheduledDate)}</td>
                    <td className="py-3 text-right">
                      <MaintenanceStatusBadge status={m.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <ul className="divide-y divide-border md:hidden">
            {maintenanceRows.map((m) => {
              const asset = assetLabel(m.assetId, m.assetName, m.assetTag);
              return (
                <li key={m.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <AssetCell id={m.assetId} name={asset.name} tag={asset.tag} />
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {m.title}, {formatDate(m.scheduledDate)}
                    </p>
                  </div>
                  <MaintenanceStatusBadge status={m.status} className="shrink-0" />
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          <table className="hidden w-full text-left text-[13px] md:table">
            <thead>
              <tr className="text-[11px] text-muted-foreground">
                <th className="pb-2.5 font-medium">Asset</th>
                <th className="pb-2.5 font-medium">With</th>
                <th className="pb-2.5 font-medium">Due back</th>
                <th className="w-[28%] pb-2.5 font-medium">Loan period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loans.map((loan) => {
                const asset = assetLabel(loan.assetId);
                const status = loanStatus(loan, now, overdueIds.has(loan.id));
                return (
                  <tr key={loan.id} className="align-middle">
                    <td className="py-3 pr-3">
                      <AssetCell id={loan.assetId} name={asset.name} tag={asset.tag} />
                    </td>
                    <td className="py-3 pr-3">
                      <PersonCell name={nameOf(loan.userId, loan.userName)} />
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <p className="text-foreground">{loan.expectedReturnDate ? formatDate(loan.expectedReturnDate) : "-"}</p>
                      <p className={status.overdue ? "text-[11px] font-medium text-rose-600 dark:text-rose-400" : "text-[11px] text-muted-foreground"}>
                        {status.text}
                      </p>
                    </td>
                    <td className="py-3">
                      {status.percent == null ? (
                        <span className="text-xs text-muted-foreground">Open-ended</span>
                      ) : (
                        <Meter percent={status.percent} tone={status.overdue ? "critical" : "brand"} label={status.overdue ? "Late" : undefined} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <ul className="divide-y divide-border md:hidden">
            {loans.map((loan) => {
              const asset = assetLabel(loan.assetId);
              const status = loanStatus(loan, now, overdueIds.has(loan.id));
              return (
                <li key={loan.id} className="space-y-2 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <AssetCell id={loan.assetId} name={asset.name} tag={asset.tag} />
                    <span
                      className={
                        status.overdue
                          ? "shrink-0 text-[11px] font-medium text-rose-600 dark:text-rose-400"
                          : "shrink-0 text-[11px] text-muted-foreground"
                      }
                    >
                      {status.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <PersonCell name={nameOf(loan.userId, loan.userName)} compact />
                    {status.percent != null && (
                      <div className="flex-1">
                        <Meter percent={status.percent} tone={status.overdue ? "critical" : "brand"} label={status.overdue ? "Late" : undefined} />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </DashboardCard>
  );
}

function AssetCell({ id, name, tag }: { id: string; name: string; tag: string }) {
  return (
    <Link to={`/assets/${id}`} className="group block min-w-0">
      <p className="truncate font-medium text-foreground group-hover:underline">{name}</p>
      {tag && <p className="truncate font-mono text-[11px] text-muted-foreground">{tag}</p>}
    </Link>
  );
}

function PersonCell({ name, compact = false }: { name: string; compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[10px] font-semibold text-brand-link">
        {getInitials(name)}
      </span>
      <span className={compact ? "max-w-24 truncate text-xs text-muted-foreground" : "truncate text-foreground"}>{name}</span>
    </span>
  );
}
