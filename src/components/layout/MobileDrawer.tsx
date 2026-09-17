import { NavLink } from "react-router-dom";
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
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/Logo";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "cn";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, end: true },
  { name: "All Assets", href: "/assets", icon: Box },
  { name: "Check-Out / Return", href: "/check-in-out", icon: ArrowLeftRight },
  { name: "Maintenance", href: "/maintenance", icon: Wrench },
  { name: "Audits", href: "/audits", icon: ClipboardCheck },
  { name: "People", href: "/people", icon: Users },
  { name: "Vendors", href: "/vendors", icon: Building2 },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Labels", href: "/labels", icon: Tags },
  { name: "Settings", href: "/settings", icon: Settings },
] as const;

export function MobileDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const org = useAuthStore((s) => s.org);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle asChild>
            <Logo logoUrl={org?.logoUrl} orgName={org?.name} />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-0.5 p-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                end={"end" in item ? item.end : false}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )
                }
              >
                <Icon className="size-4" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
