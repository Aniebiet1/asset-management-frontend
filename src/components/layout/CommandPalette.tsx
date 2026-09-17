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

const pages = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "All Assets", href: "/assets", icon: Box },
  { name: "Check-Out / Return", href: "/check-in-out", icon: ArrowLeftRight },
  { name: "Maintenance", href: "/maintenance", icon: Wrench },
  { name: "Audits", href: "/audits", icon: ClipboardCheck },
  { name: "People", href: "/people", icon: Users },
  { name: "Vendors", href: "/vendors", icon: Building2 },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Labels", href: "/labels", icon: Tags },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const assets = useAssetsQuery({ page: 1, pageSize: 6 }, { enabled: isOpen });

  const go = (href: string) => {
    navigate(href);
    onClose();
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => !open && onClose()} title="Search" description="Search assets and navigate the app">
      <CommandInput placeholder="Search assets, or jump to a page..." />
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
          {pages.map((p) => (
            <CommandItem key={p.href} onSelect={() => go(p.href)}>
              <p.icon className="mr-2 size-4" />
              {p.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Assets">
          {(assets.data?.data ?? []).map((a) => (
            <CommandItem key={a.id} onSelect={() => go(`/assets/${a.id}`)}>
              <Box className="mr-2 size-4" />
              <span className="truncate">{a.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{a.assetTag}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
