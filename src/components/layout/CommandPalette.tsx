import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Box,
  ArrowLeftRight,
  Wrench,
  ClipboardCheck,
  Users,
  Building2,
  BarChart3,
  Tags,
  Settings,
  Plus,
  UserRound,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAssetsQuery } from "@/features/assets/api";
import { usePeopleQuery } from "@/features/check-in-out/api";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth.store";

const pages = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "All Assets", href: "/assets", icon: Box },
  { name: "Check-Out / Return", href: "/check-in-out", icon: ArrowLeftRight },
  { name: "Maintenance", href: "/maintenance", icon: Wrench },
  { name: "Audits", href: "/audits", icon: ClipboardCheck },
  { name: "People", href: "/people", icon: Users, permission: "canManagePeople" },
  { name: "Vendors", href: "/vendors", icon: Building2 },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Labels", href: "/labels", icon: Tags },
  { name: "Settings", href: "/settings", icon: Settings },
] as const;

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  // Searches the server (name, tag, serial...) rather than filtering a fixed handful of recent
  // assets locally, which made anything older than the newest six unfindable.
  const assets = useAssetsQuery({ page: 1, pageSize: 8, search: debouncedQuery || undefined }, { enabled: isOpen });
  const canSeePeople = hasPermission(currentUser?.role, "canManagePeople");
  const people = usePeopleQuery();
  const matchingPeople = canSeePeople && query.trim()
    ? (people.data ?? [])
        .filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 5)
    : [];
  const visiblePages = pages.filter((p) => !("permission" in p) || hasPermission(currentUser?.role, p.permission));

  const go = (href: string) => {
    navigate(href);
    onClose();
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => !open && onClose()} title="Search" description="Search assets and navigate the app">
      <CommandInput placeholder="Search assets, people, or jump to a page..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/assets/new")}>
            <Plus className="mr-2 size-4" />
            New Asset
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Pages">
          {visiblePages.map((p) => (
            <CommandItem key={p.href} onSelect={() => go(p.href)}>
              <p.icon className="mr-2 size-4" />
              {p.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Assets">
          {(assets.data?.data ?? []).map((a) => (
            <CommandItem
              key={a.id}
              // Include every field the server matched on, so cmdk's own filter keeps the row.
              value={`${a.name} ${a.assetTag} ${a.serialNumber ?? ""} ${a.brand ?? ""} ${a.model ?? ""} ${a.id}`}
              onSelect={() => go(`/assets/${a.id}`)}
            >
              <Box className="mr-2 size-4" />
              <span className="truncate">{a.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{a.assetTag}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {matchingPeople.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="People">
              {matchingPeople.map((u) => (
                <CommandItem key={u.id} value={`${u.name} ${u.email} ${u.id}`} onSelect={() => go("/people")}>
                  <UserRound className="mr-2 size-4" />
                  <span className="truncate">{u.name}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">{u.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
