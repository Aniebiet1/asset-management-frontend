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

/**
 * Single-tenant workspace indicator. Plan §A/§I put multi-org switching entirely inside
 * the Tecres platform-admin surface (impersonation), not here — a tenant user belongs to
 * exactly one org, so this is a status readout, not a real switcher.
 */
export function OrgSwitcher() {
  const org = useAuthStore((s) => s.org);
  if (!org) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-sidebar-accent"
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-5 shrink-0 items-center justify-center rounded bg-sidebar-accent text-[10px] font-bold text-sidebar-accent-foreground">
              {org.name.charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-xs font-semibold text-sidebar-foreground">{org.name}</span>
          </div>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground group-hover:text-sidebar-foreground" />
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
