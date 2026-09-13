import { useNavigate } from "react-router-dom";
import { Search, Menu, LogOut, Moon, Sun, Bell, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/Logo";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/theme.store";
import { mockNotifications, mockUsers } from "@/lib/mock-data";
import { getInitials } from "@/lib/format";
import { toast } from "sonner";

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenCommandPalette, onOpenMobileMenu }: HeaderProps) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const switchPersona = useAuthStore((s) => s.switchPersona);
  const isDark = useThemeStore((s) => s.isDark);
  const toggleDark = useThemeStore((s) => s.toggleDark);
  const isSidebarCollapsed = useThemeStore((s) => s.isSidebarCollapsed);
  const toggleSidebar = useThemeStore((s) => s.toggleSidebar);

  const unreadCount = mockNotifications.filter((n) => !n.isRead).length;

  const handleLogout = () => {
    logout();
    toast.info("Signed out");
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-background px-3 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Open sidebar"
            title="Open sidebar"
            className="hidden shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
          >
            <PanelLeftOpen className="size-5" />
          </button>
        )}

        <div className="shrink-0 lg:hidden">
          <Logo variant="icon" size="sm" />
        </div>

        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex w-full max-w-xs items-center gap-2 truncate rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-input hover:text-foreground sm:max-w-sm"
        >
          <Search className="size-3.5 shrink-0" />
          <span className="truncate">Search assets, people...</span>
          <kbd className="ml-auto hidden shrink-0 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
            Ctrl K
          </kbd>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="Toggle theme" title="Toggle theme">
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 text-xs">
            <DropdownMenuLabel className="px-2 py-1.5 font-semibold">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {mockNotifications.map((n) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 whitespace-normal px-2 py-2">
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{n.title}</span>
                  {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                </div>
                <span className="text-[11px] text-muted-foreground">{n.message}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 px-1.5 sm:pl-1.5 sm:pr-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                {currentUser ? getInitials(currentUser.name) : "?"}
              </div>
              <span className="hidden font-medium sm:inline-block">{currentUser?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 text-xs">
            <DropdownMenuLabel className="p-2 font-normal">
              <div className="truncate font-semibold text-foreground">{currentUser?.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">{currentUser?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-2 py-1 text-[10px] font-medium uppercase text-muted-foreground">
              Preview as (Phase 1 demo)
            </DropdownMenuLabel>
            {mockUsers.map((u) => (
              <DropdownMenuItem key={u.id} className="cursor-pointer" onClick={() => switchPersona(u.id)}>
                {u.name} <span className="ml-auto text-[10px] text-muted-foreground capitalize">{u.role.replace("_", " ")}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 size-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
