import type { PermissionSet, UserRole } from "@/types";

/**
 * Ported from asset-management-backend/src/lib/permissions.ts.
 *
 * This is a frontend nav-convenience copy ONLY — per solid_implementation_plan.md §E,
 * `canAccessRoute()`-style gating here decides what to render (hide a nav item, disable
 * a button), it is NOT the security boundary. The backend's `authorize()` middleware,
 * which doesn't trust the client at all, is. Never rely on this module alone to hide
 * data that must actually stay hidden (e.g. asset valuation for staff) — the API omits
 * those fields entirely for roles without canViewAssetValuation.
 */

const ADMIN_LIKE: PermissionSet = {
  canManageOrg: true,
  canManageSettings: true,
  canCreateAsset: true,
  canEditAsset: true,
  canDeleteAsset: true,
  canEditAssetIdentity: true,
  canCheckInOut: true,
  canScheduleMaintenance: true,
  canCompleteMaintenance: true,
  canManagePeople: true,
  canManageVendors: true,
  canExportReports: true,
  canPrintLabels: true,
  canAssignAudits: true,
  canVerifyAudits: true,
  canPerformAssignedAudit: true,
  canViewAssetValuation: true,
};

const ASSET_MANAGER: PermissionSet = {
  canManageOrg: false,
  canManageSettings: false,
  canCreateAsset: true,
  canEditAsset: true,
  canDeleteAsset: false,
  canEditAssetIdentity: false,
  canCheckInOut: true,
  canScheduleMaintenance: true,
  canCompleteMaintenance: true,
  canManagePeople: false,
  canManageVendors: true,
  canExportReports: true,
  canPrintLabels: true,
  canAssignAudits: true,
  canVerifyAudits: true,
  canPerformAssignedAudit: true,
  canViewAssetValuation: true,
};

const STAFF: PermissionSet = {
  canManageOrg: false,
  canManageSettings: false,
  canCreateAsset: false,
  canEditAsset: false,
  canDeleteAsset: false,
  canEditAssetIdentity: false,
  canCheckInOut: false,
  canScheduleMaintenance: true,
  canCompleteMaintenance: false,
  canManagePeople: false,
  canManageVendors: false,
  canExportReports: false,
  canPrintLabels: false,
  canAssignAudits: false,
  canVerifyAudits: false,
  canPerformAssignedAudit: true,
  canViewAssetValuation: false,
};

export function getRolePermissions(role?: UserRole | string): PermissionSet {
  const r = (role || "staff") as UserRole;
  if (r === "super_admin" || r === "admin") return ADMIN_LIKE;
  if (r === "asset_manager") return ASSET_MANAGER;
  return STAFF;
}

export function hasPermission(
  role: UserRole | string | undefined,
  permission: keyof PermissionSet
): boolean {
  return getRolePermissions(role)[permission];
}
