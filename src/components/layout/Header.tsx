import { useNavigate } from "react-router-dom";
import { Search, Menu, LogOut, Bell, ChevronDown, BookOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth.store";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from "@/features/notifications/api";
import type { AppNotification } from "@/types";
import { getInitials, formatRelativeTime } from "@/lib/format";
import { roleLabelMap } from "@/lib/status";
import { toast } from "sonner";
import { BrandMark } from "./shell/BrandMark";
import { ThemeToggleButton, Topbar, TopbarIconButton } from "./shell/Topbar";

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenCommandPalette, onOpenMobileMenu }: HeaderProps) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const logout = useAuthStore((s) => s.logout);

  const { data: notifications = [] } = useNotificationsQuery();
  const markNotificationRead = useMarkNotificationReadMutation();
  const markAllNotificationsRead = useMarkAllNotificationsReadMutation();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.isRead) markNotificationRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  const handleLogout = async () => {
    await logout();
    toast.info("Signed out");
    navigate("/login", { replace: true });
  };

  return (
    <Topbar
      start={
        <>
          <TopbarIconButton onClick={onOpenMobileMenu} aria-label="Open navigation menu" className="-ml-1.5 lg:hidden">
            <Menu className="size-5" />
          </TopbarIconButton>
          <BrandMark logoUrl={org?.logoUrl} name={org?.name ?? "Workspace"} className="size-8 rounded-lg lg:hidden" />

          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden h-10 w-full max-w-sm items-center gap-2.5 rounded-full border border-tb-field-border bg-tb-field px-4 text-[13px] text-tb-muted shadow-xs transition-colors hover:text-tb-foreground sm:flex"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate">Search assets, people...</span>
            <kbd className="ml-auto hidden rounded-md border border-tb-field-border px-1.5 py-0.5 font-sans text-[10px] font-medium lg:inline">
              Ctrl K
            </kbd>
          </button>
        </>
      }
      end={
        <>
          <TopbarIconButton onClick={onOpenCommandPalette} aria-label="Search" className="sm:hidden">
            <Search className="size-[18px]" />
          </TopbarIconButton>
          <ThemeToggleButton />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TopbarIconButton aria-label="Notifications">
                <Bell className="size-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground ring-2 ring-tb">
                    {unreadCount}
                  </span>
                )}
              </TopbarIconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 text-xs">
              <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                <DropdownMenuLabel className="p-0 font-semibold">Notifications</DropdownMenuLabel>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsRead.mutate()}
                    className="shrink-0 text-[11px] font-medium text-brand-link hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="px-2 py-6 text-center text-muted-foreground">No notifications yet</div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="flex flex-col items-start gap-0.5 px-2 py-2 whitespace-normal"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{n.title}</span>
                      {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{n.message}</span>
                    <span className="text-[10px] text-muted-foreground/70">{formatRelativeTime(n.createdAt)}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-1 flex items-center gap-2.5 rounded-full p-0.5 transition-colors hover:bg-tb-hover sm:pr-2.5"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-frame text-xs font-semibold text-frame-foreground max-lg:bg-frame-active">
                  {currentUser ? getInitials(currentUser.name) : "?"}
                </span>
                <span className="hidden min-w-0 flex-col text-left leading-tight md:flex">
                  <span className="max-w-[10rem] truncate text-[13px] font-semibold text-tb-foreground">{currentUser?.name}</span>
                  <span className="text-[11px] text-tb-muted">{currentUser ? roleLabelMap[currentUser.role] : ""}</span>
                </span>
                <ChevronDown className="hidden size-3.5 text-tb-muted sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuLabel className="p-2 font-normal">
                <div className="truncate font-semibold text-foreground">{currentUser?.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{currentUser?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/guide")} className="cursor-pointer">
                <BookOpen className="mr-2 size-3.5" />
                User guide
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 size-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}
