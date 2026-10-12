/**
 * Ported from ink-asset-management/src/lib/utils.ts's color maps (plan §M), extended
 * with the audit state machine (plan §D) which has no equivalent in the monolith.
 */

export interface StatusVisual {
  bg: string;
  text: string;
  /** Inset ring color (`ring-*`), drawn by the badge's ring-1 ring-inset. */
  border: string;
  label: string;
}

export const statusColorMap: Record<string, StatusVisual> = {
  available: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "ring-emerald-500/25", label: "Available" },
  in_use: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", border: "ring-blue-500/25", label: "In Use" },
  in_maintenance: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "ring-amber-500/25", label: "In Maintenance" },
  reserved: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-400", border: "ring-purple-500/25", label: "Reserved" },
  disposed: { bg: "bg-muted", text: "text-muted-foreground", border: "ring-border", label: "Disposed" },
  lost: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-400", border: "ring-rose-500/25", label: "Lost / Missing" },
};

export const conditionColorMap: Record<string, StatusVisual> = {
  excellent: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "ring-emerald-500/25", label: "Excellent" },
  good: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", border: "ring-blue-500/25", label: "Good" },
  fair: { bg: "bg-yellow-500/10", text: "text-yellow-700 dark:text-yellow-400", border: "ring-yellow-500/25", label: "Fair" },
  poor: { bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-400", border: "ring-orange-500/25", label: "Poor" },
  damaged: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-400", border: "ring-red-500/25", label: "Damaged" },
};

export const priorityColorMap: Record<string, StatusVisual> = {
  low: { bg: "bg-muted", text: "text-muted-foreground", border: "ring-border", label: "Low" },
  medium: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", border: "ring-blue-500/25", label: "Medium" },
  high: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "ring-amber-500/25", label: "High" },
  critical: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-400", border: "ring-red-500/25", label: "Critical" },
};

export const maintenanceStatusColorMap: Record<string, StatusVisual> = {
  scheduled: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", border: "ring-blue-500/25", label: "Scheduled" },
  in_progress: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "ring-amber-500/25", label: "In Progress" },
  waiting_parts: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-400", border: "ring-purple-500/25", label: "Waiting Parts" },
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "ring-emerald-500/25", label: "Completed" },
  cancelled: { bg: "bg-muted", text: "text-muted-foreground", border: "ring-border", label: "Cancelled" },
};

/** Audit workflow states - plan §D: draft to assigned to in_progress to submitted to verified, or to rejected/cancelled. */
export const auditStatusColorMap: Record<string, StatusVisual> = {
  draft: { bg: "bg-muted", text: "text-muted-foreground", border: "ring-border", label: "Draft" },
  assigned: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", border: "ring-blue-500/25", label: "Assigned" },
  in_progress: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "ring-amber-500/25", label: "In Progress" },
  submitted: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-400", border: "ring-purple-500/25", label: "Submitted" },
  verified: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "ring-emerald-500/25", label: "Verified" },
  rejected: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-400", border: "ring-rose-500/25", label: "Rejected" },
  cancelled: { bg: "bg-muted", text: "text-muted-foreground", border: "ring-border", label: "Cancelled" },
};

/** Per-item scan outcome within an audit (plan §D) - distinct from the audit's own workflow status above. */
export const auditItemStatusColorMap: Record<string, StatusVisual> = {
  pending: { bg: "bg-muted", text: "text-muted-foreground", border: "ring-border", label: "Pending" },
  matched: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "ring-emerald-500/25", label: "Matched" },
  missing: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-400", border: "ring-rose-500/25", label: "Missing" },
  relocated: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", border: "ring-blue-500/25", label: "Relocated" },
  damaged: { bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-400", border: "ring-orange-500/25", label: "Damaged" },
};

export const planStatusColorMap: Record<string, StatusVisual> = {
  active: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "ring-emerald-500/25", label: "Active" },
  suspended: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-400", border: "ring-rose-500/25", label: "Suspended" },
  expired: { bg: "bg-muted", text: "text-muted-foreground", border: "ring-border", label: "Expired" },
};

export const alertSeverityColorMap: Record<string, StatusVisual> = {
  info: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", border: "ring-blue-500/25", label: "Info" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "ring-amber-500/25", label: "Warning" },
  critical: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-400", border: "ring-rose-500/25", label: "Critical" },
};

export const roleLabelMap: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  asset_manager: "Asset Manager",
  staff: "Staff",
  platform_owner: "Platform Owner",
  platform_support: "Platform Support",
};

/** Chart colors per asset status, in the fixed order the status donut draws them. Fixed per
 * status (never by position or brand) and validated as an adjacent set in both modes, see the
 * --viz-* tokens in index.css. */
export const assetStatusVizOrder = ["in_use", "available", "in_maintenance", "reserved", "lost", "disposed"] as const;
export const assetStatusVizColor: Record<string, string> = {
  in_use: "var(--viz-blue)",
  available: "var(--viz-aqua)",
  in_maintenance: "var(--viz-yellow)",
  reserved: "var(--viz-violet)",
  lost: "var(--viz-red)",
  disposed: "var(--viz-gray)",
};
export const planStatusVizColor: Record<string, string> = {
  active: "var(--viz-aqua)",
  suspended: "var(--viz-red)",
  expired: "var(--viz-gray)",
};
