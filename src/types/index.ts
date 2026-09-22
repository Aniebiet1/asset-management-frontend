/**
 * Domain types mirroring the backend's Drizzle schema (asset-management-backend/src/db/schema/*)
 * and permission matrix (asset-management-backend/src/lib/permissions.ts).
 *
 * Kept hand-in-sync rather than generated for now — Phase 1 is UI-only (mock data shaped
 * to these types), Phase 2 wires TanStack Query against the real endpoints without
 * needing to touch component code, since the shapes already match the API's `{ data: T }`
 * envelope.
 */

// ---------------------------------------------------------------------------
// Auth / Users
// ---------------------------------------------------------------------------

export type UserRole = "super_admin" | "admin" | "asset_manager" | "staff";

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId: string;
  title: string | null;
  departmentId: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** `GET /auth/me` response shape, plus the org context the shell needs to render. */
export interface CurrentUser extends User {
  orgName: string;
}

// ---------------------------------------------------------------------------
// Permissions (frontend nav-convenience copy — NOT the security boundary,
// see solid_implementation_plan.md §E; the backend's authorize() middleware is).
// ---------------------------------------------------------------------------

export interface PermissionSet {
  canManageOrg: boolean;
  canManageSettings: boolean;
  canCreateAsset: boolean;
  canEditAsset: boolean;
  canDeleteAsset: boolean;
  canCheckInOut: boolean;
  canScheduleMaintenance: boolean;
  canCompleteMaintenance: boolean;
  canManagePeople: boolean;
  canManageVendors: boolean;
  canExportReports: boolean;
  canPrintLabels: boolean;
  canAssignAudits: boolean;
  canVerifyAudits: boolean;
  canPerformAssignedAudit: boolean;
  canViewAssetValuation: boolean;
}

// ---------------------------------------------------------------------------
// Organizations (theme + plan)
// ---------------------------------------------------------------------------

export type PlanStatus = "active" | "suspended" | "expired";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  currency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  assetQuota: number;
  userQuota: number;
  primaryColor: string;
  accentColor: string | null;
  sidebarColor: string | null;
  labelFormat: "barcode_qr" | "barcode_only" | "qr_only" | null;
  onboardingCompletedAt: string | null;
  planStatus: PlanStatus;
  planExpiresAt: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LabelFormat = NonNullable<Organization["labelFormat"]>;

export interface LabelSheetLayout {
  labelWidthMm: number;
  labelHeightMm: number;
  columns: number;
  rows: number;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  gapHorizontalMm: number;
  gapVerticalMm: number;
  pageSize: "a4" | "letter";
}

// ---------------------------------------------------------------------------
// Catalog: departments / locations / categories / vendors
// ---------------------------------------------------------------------------

export interface Department {
  id: string;
  orgId: string;
  name: string;
  code: string;
  description: string | null;
  managerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  orgId: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  building: string | null;
  floor: string | null;
  room: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  orgId: string;
  name: string;
  code: string;
  icon: string;
  color: string;
  description: string | null;
  usefulLifeMonths: number;
  depreciationRate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  orgId: string;
  name: string;
  code: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export type AssetStatus = "available" | "in_use" | "in_maintenance" | "reserved" | "disposed" | "lost";
export type AssetCondition = "excellent" | "good" | "fair" | "poor" | "damaged";

export interface Asset {
  id: string;
  orgId: string;
  assetTag: string;
  name: string;
  description: string | null;
  categoryId: string;
  departmentId: string | null;
  locationId: string;
  vendorId: string | null;
  custodianId: string | null;
  status: AssetStatus;
  condition: AssetCondition;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  macAddress: string | null;
  ipAddress: string | null;
  purchaseDate: string | null;
  /** Absent (not null) for roles without canViewAssetValuation — see stripValuationFields on the backend. */
  purchasePrice?: string;
  currentValue?: string;
  salvageValue?: string;
  depreciationType: "straight_line";
  warrantyExpiry: string | null;
  warrantyNotes: string | null;
  barcodeData: string | null;
  qrCodeData: string | null;
  imageUrl: string | null;
  customFields: Record<string, unknown>;
  notes: string | null;
  createdAt: string;
  updatedAt: string;

  // Convenience denormalizations the list/detail endpoints join in for display.
  categoryName?: string;
  departmentName?: string;
  locationName?: string;
  vendorName?: string;
  custodianName?: string;
}

export interface AssetAssignment {
  id: string;
  orgId: string;
  assetId: string;
  userId: string;
  assignedBy: string | null;
  assignedAt: string;
  expectedReturnDate: string | null;
  returnedAt: string | null;
  conditionOut: AssetCondition;
  conditionIn: AssetCondition | null;
  notes: string | null;
  receiptNo: string | null;
  signatureUrl: string | null;
  createdAt: string;

  userName?: string;
}

export type MaintenanceType = "preventive" | "corrective" | "calibration" | "inspection" | "upgrade";
export type MaintenanceStatus = "scheduled" | "in_progress" | "waiting_parts" | "completed" | "cancelled";
export type MaintenancePriority = "low" | "medium" | "high" | "critical";

export interface MaintenanceRecord {
  id: string;
  orgId: string;
  assetId: string;
  title: string;
  description: string | null;
  maintenanceType: MaintenanceType;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  scheduledDate: string;
  startDate: string | null;
  completedDate: string | null;
  cost: string;
  partsUsed: string | null;
  technicianName: string | null;
  vendorId: string | null;
  performedBy: string | null;
  notes: string | null;
  invoiceFileId: string | null;
  createdAt: string;
  updatedAt: string;

  assetName?: string;
  assetTag?: string;
}

// ---------------------------------------------------------------------------
// Audits (assign → scan → submit → verify state machine, plan §D)
// ---------------------------------------------------------------------------

export type AuditStatus = "draft" | "assigned" | "in_progress" | "submitted" | "verified" | "rejected" | "cancelled";
export type AuditScopeType = "all" | "location" | "department" | "category";
export type AuditItemStatus = "pending" | "matched" | "missing" | "relocated" | "damaged";

export interface Audit {
  id: string;
  orgId: string;
  name: string;
  code: string;
  status: AuditStatus;
  scopeType: AuditScopeType;
  scopeId: string | null;

  totalExpected: number;
  totalScanned: number;
  totalMatched: number;
  totalMissing: number;
  totalDiscrepant: number;

  assignedTo: string | null;
  assignedBy: string | null;
  assignedAt: string | null;

  startedAt: string | null;

  submittedAt: string | null;
  submittedBy: string | null;

  verifiedAt: string | null;
  verifiedBy: string | null;

  staffRemark: string | null;
  verifierRemark: string | null;
  rejectionReason: string | null;

  performedBy: string | null;
  completedAt: string | null;
  notes: string | null;

  createdAt: string;

  assignedToName?: string;
  assignedByName?: string;
  submittedByName?: string;
  verifiedByName?: string;
}

export interface AuditItem {
  id: string;
  auditId: string;
  assetId: string;
  status: AuditItemStatus;
  scannedAt: string | null;
  scannedBy: string | null;
  scannedLocationId: string | null;
  conditionFound: AssetCondition | null;
  notes: string | null;

  assetName?: string;
  assetTag?: string;
}

export interface AuditStatusHistoryEntry {
  id: string;
  auditId: string;
  fromStatus: AuditStatus | null;
  toStatus: AuditStatus;
  actorId: string | null;
  actorName?: string;
  remark: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Notifications / Activity
// ---------------------------------------------------------------------------

export type NotificationType = "info" | "warning" | "success" | "danger";

export interface AppNotification {
  id: string;
  orgId: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  orgId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;

  userName?: string;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardStats {
  assets: {
    total: number;
    available: number;
    inUse: number;
    inMaintenance: number;
    disposed: number;
    /** Absent for roles without canViewAssetValuation. */
    totalValue?: string;
  };
  activeUsers: number;
  maintenanceDue: number;
}

export interface DashboardCharts {
  byCategory: { categoryId: string | null; categoryName?: string; count: number }[];
  byStatus: { status: AssetStatus; count: number }[];
}

// ---------------------------------------------------------------------------
// Platform admin (Tecres staff — separate identity space, plan §I)
// ---------------------------------------------------------------------------

export type PlatformAdminRole = "platform_owner" | "platform_support";

export interface PlatformAdmin {
  id: string;
  name: string;
  email: string;
  totpEnabled: boolean;
  role: PlatformAdminRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A platform-console invite that hasn't been accepted yet. Accepted ones become `PlatformAdmin`s. */
export interface PlatformAdminInvite {
  id: string;
  name: string;
  email: string;
  role: PlatformAdminRole;
  status: "pending" | "expired";
  invitedByName: string | null;
  expiresAt: string;
  createdAt: string;
}

/** What the public accept page can see before the invitee sets a password. */
export interface PlatformAdminInvitePreview {
  name: string;
  email: string;
  role: PlatformAdminRole;
  roleLabel: string;
  expiresAt: string;
}

export type PlatformAlertType = "quota_breach" | "failed_login_spike" | "plan_expired" | "stale_org" | "security_incident";
export type PlatformAlertSeverity = "info" | "warning" | "critical";
export type PlatformAlertStatus = "open" | "acknowledged" | "resolved";

export interface PlatformAlert {
  id: string;
  orgId: string | null;
  orgName?: string;
  type: PlatformAlertType;
  severity: PlatformAlertSeverity;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  status: PlatformAlertStatus;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface PlatformOrgSummary {
  id: string;
  name: string;
  slug: string;
  planStatus: PlanStatus;
  planExpiresAt: string | null;
  assetCount: number;
  assetQuota: number;
  userCount: number;
  userQuota: number;
  lastActivityAt: string | null;
}

export interface FleetAnalytics {
  growth: { month: string; newOrgs: number; newAssets: number }[];
  planBreakdown: { active: number; suspended: number; expired: number };
  risk: {
    suspendedOrgs: number;
    orgsNearAssetQuota: number;
    orgsNearUserQuota: number;
    overdueMaintenance: number;
    riskyAssets: number;
    /** Org ids behind the two asset-level counts above, so the dashboard's risk tiles can deep-link
     * into a filtered organization list. */
    orgIdsWithOverdueMaintenance: string[];
    orgIdsWithRiskyAssets: string[];
  };
}

export interface LoginRiskEntry {
  userId: string;
  userName: string;
  userEmail: string;
  orgId: string;
  orgName: string;
  failedLoginAttempts: number;
  isLocked: boolean;
  lockedUntil: string | null;
  lastIp: string | null;
  lastAttemptAt: string | null;
  distinctIpCount: number;
}

export interface PlatformOrgUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  totpEnabled: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// API envelope helpers
// ---------------------------------------------------------------------------

export interface ApiListResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface ApiItemResponse<T> {
  data: T;
}

// ---------------------------------------------------------------------------
// Audit detail / report API response shapes (Phase 6)
// ---------------------------------------------------------------------------

/** `GET /audits/:id` response shape: the audit plus its scoped scan items. */
export interface AuditWithItems {
  audit: Audit;
  items: AuditItem[];
}

/** `GET /audits/:id/report` response shape, only reachable once an audit is `verified`. */
export interface AuditReport {
  audit: Audit;
  items: AuditItem[];
  history: AuditStatusHistoryEntry[];
  summary: {
    totalExpected: number;
    totalScanned: number;
    totalMatched: number;
    totalMissing: number;
    totalDiscrepant: number;
  };
}

/** `POST /audits/:id/scan` response shape. */
export interface AuditScanResult {
  asset: Asset;
  status: AuditItemStatus;
}
