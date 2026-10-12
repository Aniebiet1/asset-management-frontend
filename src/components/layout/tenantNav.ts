import { LayoutDashboard, Box, ArrowLeftRight, Wrench, ClipboardCheck, Users, Building2, BarChart3, Tags, Settings } from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import type { PermissionSet, UserRole } from "@/types";
import type { NavItem, NavSection } from "./shell/types";

type GatedItem = NavItem & { permission?: keyof PermissionSet };

const SECTIONS: { label?: string; items: GatedItem[] }[] = [
  { items: [{ name: "Dashboard", href: "/", icon: LayoutDashboard, end: true }] },
  {
    label: "Assets",
    items: [
      { name: "All Assets", href: "/assets", icon: Box },
      { name: "Check-Out / Return", href: "/check-in-out", icon: ArrowLeftRight },
      { name: "Labels", href: "/labels", icon: Tags },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Maintenance", href: "/maintenance", icon: Wrench },
      { name: "Audits", href: "/audits", icon: ClipboardCheck },
      { name: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Directory",
    items: [
      { name: "People", href: "/people", icon: Users, permission: "canManagePeople" },
      { name: "Vendors", href: "/vendors", icon: Building2 },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { name: "Settings", href: "/settings", icon: Settings };

export const DOCK_ITEMS: NavItem[] = [
  { name: "Home", href: "/", icon: LayoutDashboard, end: true },
  { name: "Assets", href: "/assets", icon: Box },
  { name: "Check-Out", href: "/check-in-out", icon: ArrowLeftRight },
  { name: "Audits", href: "/audits", icon: ClipboardCheck },
];

/** Nav sections with role-gated items removed (UX only, see permissions.ts) and empty groups dropped. */
export function tenantNavSections(role: UserRole | undefined): NavSection[] {
  return SECTIONS.map((section) => ({
    label: section.label,
    items: section.items.filter((item) => !item.permission || hasPermission(role, item.permission)),
  })).filter((section) => section.items.length > 0);
}

export function canSeeSettings(role: UserRole | undefined): boolean {
  return hasPermission(role, "canManageSettings") || hasPermission(role, "canManageOrg");
}
