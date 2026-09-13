/**
 * Ported from ink-asset-management/src/lib/utils.ts's color maps (plan §M), extended
 * with the audit state machine (plan §D) which has no equivalent in the monolith.
 */

export interface StatusVisual {
  bg: string;
  text: string;
  border: string;
  label: string;
}

export const statusColorMap: Record<string, StatusVisual> = {
  available: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Available" },
  in_use: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", label: "In Use" },
  in_maintenance: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "In Maintenance" },
  reserved: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", label: "Reserved" },
  disposed: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", label: "Disposed" },
  lost: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", label: "Lost / Missing" },
};

export const conditionColorMap: Record<string, StatusVisual> = {
  excellent: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Excellent" },
  good: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", label: "Good" },
  fair: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", label: "Fair" },
  poor: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", label: "Poor" },
  damaged: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", label: "Damaged" },
};

export const priorityColorMap: Record<string, StatusVisual> = {
  low: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", label: "Low" },
  medium: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", label: "Medium" },
  high: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "High" },
  critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", label: "Critical" },
};

export const maintenanceStatusColorMap: Record<string, StatusVisual> = {
  scheduled: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", label: "Scheduled" },
  in_progress: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "In Progress" },
  waiting_parts: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", label: "Waiting Parts" },
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Completed" },
  cancelled: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", label: "Cancelled" },
};

/** Audit workflow states — plan §D: draft → assigned → in_progress → submitted → verified, or → rejected/cancelled. */
export const auditStatusColorMap: Record<string, StatusVisual> = {
  draft: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", label: "Draft" },
  assigned: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", label: "Assigned" },
  in_progress: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "In Progress" },
  submitted: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", label: "Submitted" },
  verified: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Verified" },
  rejected: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", label: "Rejected" },
  cancelled: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", label: "Cancelled" },
};

export const planStatusColorMap: Record<string, StatusVisual> = {
  active: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Active" },
  suspended: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", label: "Suspended" },
  expired: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", label: "Expired" },
};

export const alertSeverityColorMap: Record<string, StatusVisual> = {
  info: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", label: "Info" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "Warning" },
  critical: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", label: "Critical" },
};

export const roleLabelMap: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  asset_manager: "Asset Manager",
  staff: "Staff",
  platform_owner: "Platform Owner",
  platform_support: "Platform Support",
};
