import { ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth.store";
import { PlanStatusBadge } from "@/components/common/StatusBadge";
import { BrandMark } from "@/components/layout/shell/BrandMark";

/**
 * Single-tenant workspace indicator, doubling as the sidebar's brand block. Plan §A/§I put
 * multi-org switching entirely inside the Tecres platform-admin surface, not here — a tenant user
 * belongs to exactly one org, so this is a status readout, not a real switcher. Uses the
 * .shell-nav tokens, so it only renders correctly inside the shell sidebar.
 */
export function OrgSwitcher({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const org = useAuthStore((s) => s.org);
  if (!org) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={isCollapsed ? org.name : undefined}
          className="group flex w-full min-w-0 items-center gap-2.5 rounded-xl p-1 text-left transition-colors hover:bg-nav-hover"
        >
          <BrandMark logoUrl={org.logoUrl} name={org.name} />
          {!isCollapsed && (
            <>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold tracking-tight text-nav-foreground">{org.name}</span>
                <span className="truncate text-[11px] text-nav-muted">Asset workspace</span>
              </div>
              <ChevronsUpDown className="size-3.5 shrink-0 text-nav-muted group-hover:text-nav-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 text-xs">
        <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5">
          <span className="font-medium text-muted-foreground">Workspace</span>
          <PlanStatusBadge status={org.planStatus} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="flex flex-col items-start gap-0.5 py-1.5">
          <span className="font-semibold text-foreground">{org.name}</span>
          <span className="text-[11px] text-muted-foreground">{org.slug}.tecres.app</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
