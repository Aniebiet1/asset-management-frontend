import type { LucideIcon } from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Match the route exactly (dashboard roots), not as a prefix. */
  end?: boolean;
}

export interface NavSection {
  /** Small caps heading above the group; omit for the ungrouped top item(s). */
  label?: string;
  items: NavItem[];
}
