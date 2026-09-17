import type { Audit, CurrentUser, MaintenanceRecord, Organization, User, AppNotification } from "@/types";

/**
 * Phase 1 mock data — shaped exactly to the real API's `{ data }` envelope and entity
 * fields (verified against asset-management-backend/src/db/schema and the dashboard/
 * assets routers) so swapping these hooks for TanStack Query calls in Phase 2 touches
 * only src/lib/api-client.ts, never the page components.
 */

export const mockOrg: Organization = {
  id: "org_1",
  name: "Acme Logistics",
  slug: "acme-logistics",
  logoUrl: null,
  currency: "NGN",
  currencySymbol: "₦",
  timezone: "Africa/Lagos",
  dateFormat: "YYYY-MM-DD",
  assetQuota: 5000,
  userQuota: 100,
  primaryColor: "#2563eb",
  accentColor: "#7c3aed",
  sidebarColor: null,
  labelFormat: null,
  onboardingCompletedAt: "2026-01-15T09:00:00Z",
  planStatus: "active",
  planExpiresAt: null,
  lastActivityAt: new Date().toISOString(),
  createdAt: "2026-01-10T09:00:00Z",
  updatedAt: "2026-01-15T09:00:00Z",
};

export const mockCurrentUser: CurrentUser = {
  id: "user_1",
  orgId: "org_1",
  orgName: mockOrg.name,
  name: "Emmanuel Ekop",
  email: "emmanuelekopimo@gmail.com",
  role: "admin",
  employeeId: "EMP-0001",
  title: "IT Operations Lead",
  departmentId: "dept_1",
  phone: "+234 801 234 5678",
  avatarUrl: null,
  isActive: true,
  totpEnabled: true,
  createdAt: "2026-01-10T09:00:00Z",
  updatedAt: "2026-01-10T09:00:00Z",
};

export const mockUsers: User[] = [
  mockCurrentUser,
  { id: "user_2", orgId: "org_1", name: "Elena Cruz", email: "elena@acmelogistics.com", role: "asset_manager", employeeId: "EMP-0002", title: "Asset Manager", departmentId: "dept_2", phone: null, avatarUrl: null, isActive: true, totpEnabled: true, createdAt: "2026-01-11T09:00:00Z", updatedAt: "2026-01-11T09:00:00Z" },
  { id: "user_3", orgId: "org_1", name: "Alex Turner", email: "alex@acmelogistics.com", role: "staff", employeeId: "EMP-0003", title: "Field Technician", departmentId: "dept_2", phone: null, avatarUrl: null, isActive: true, totpEnabled: false, createdAt: "2026-01-12T09:00:00Z", updatedAt: "2026-01-12T09:00:00Z" },
  { id: "user_4", orgId: "org_1", name: "Grace Okafor", email: "grace@acmelogistics.com", role: "staff", employeeId: "EMP-0004", title: "Warehouse Clerk", departmentId: "dept_2", phone: null, avatarUrl: null, isActive: true, totpEnabled: false, createdAt: "2026-01-13T09:00:00Z", updatedAt: "2026-01-13T09:00:00Z" },
];

export const mockMaintenanceRecords: MaintenanceRecord[] = [
  { id: "mnt_1", orgId: "org_1", assetId: "ast_4", assetName: "Toyota Hiace Van", assetTag: "ACME-AST-0004", title: "Brake pad replacement", description: null, maintenanceType: "corrective", status: "in_progress", priority: "high", scheduledDate: "2026-01-12T00:00:00Z", startDate: "2026-01-12T09:00:00Z", completedDate: null, cost: "85000.00", partsUsed: "Brake pads (front)", technicianName: "Musa Ibrahim", vendorId: null, performedBy: "user_4", notes: null, invoiceFileId: null, createdAt: "2026-01-08T09:00:00Z", updatedAt: "2026-01-12T09:00:00Z" },
  { id: "mnt_2", orgId: "org_1", assetId: "ast_3", assetName: "Cisco Catalyst 9200 Switch", assetTag: "ACME-AST-0003", title: "Firmware upgrade", description: null, maintenanceType: "preventive", status: "scheduled", priority: "medium", scheduledDate: "2026-01-20T00:00:00Z", startDate: null, completedDate: null, cost: "0.00", partsUsed: null, technicianName: null, vendorId: "vnd_2", performedBy: null, notes: null, invoiceFileId: null, createdAt: "2026-01-05T09:00:00Z", updatedAt: "2026-01-05T09:00:00Z" },
];

export const mockAudits: Audit[] = [
  { id: "adt_1", orgId: "org_1", name: "Q1 2026 Lagos HQ Count", code: "AUD-0001", status: "in_progress", scopeType: "location", scopeId: "loc_1", totalExpected: 42, totalScanned: 28, totalMatched: 26, totalMissing: 1, totalDiscrepant: 1, assignedTo: "user_3", assignedToName: "Alex Turner", assignedBy: "user_1", assignedByName: "Emmanuel Ekop", assignedAt: "2026-01-10T09:00:00Z", startedAt: "2026-01-11T08:30:00Z", submittedAt: null, submittedBy: null, verifiedAt: null, verifiedBy: null, staffRemark: null, verifierRemark: null, rejectionReason: null, performedBy: "user_3", completedAt: null, notes: null, createdAt: "2026-01-09T09:00:00Z" },
  { id: "adt_2", orgId: "org_1", name: "Warehouse 2 Spot Check", code: "AUD-0002", status: "submitted", scopeType: "location", scopeId: "loc_3", totalExpected: 15, totalScanned: 15, totalMatched: 14, totalMissing: 0, totalDiscrepant: 1, assignedTo: "user_4", assignedToName: "Grace Okafor", assignedBy: "user_2", assignedByName: "Elena Cruz", assignedAt: "2026-01-06T09:00:00Z", startedAt: "2026-01-07T09:00:00Z", submittedAt: "2026-01-08T15:00:00Z", submittedBy: "user_4", verifiedAt: null, verifiedBy: null, staffRemark: "One unit found with damaged casing, logged as discrepant.", verifierRemark: null, rejectionReason: null, performedBy: "user_4", completedAt: null, notes: null, createdAt: "2026-01-05T09:00:00Z" },
  { id: "adt_3", orgId: "org_1", name: "December 2025 Full Count", code: "AUD-0000", status: "verified", scopeType: "all", scopeId: null, totalExpected: 96, totalScanned: 96, totalMatched: 94, totalMissing: 2, totalDiscrepant: 0, assignedTo: "user_3", assignedToName: "Alex Turner", assignedBy: "user_1", assignedByName: "Emmanuel Ekop", assignedAt: "2025-12-01T09:00:00Z", startedAt: "2025-12-02T09:00:00Z", submittedAt: "2025-12-10T09:00:00Z", submittedBy: "user_3", verifiedAt: "2025-12-12T09:00:00Z", verifiedBy: "user_1", verifiedByName: "Emmanuel Ekop", staffRemark: "Two units unaccounted for, likely disposed without record.", verifierRemark: "Confirmed, added to write-off list.", rejectionReason: null, performedBy: "user_3", completedAt: "2025-12-12T09:00:00Z", notes: null, createdAt: "2025-11-28T09:00:00Z" },
];

export const mockNotifications: AppNotification[] = [
  { id: "ntf_1", orgId: "org_1", userId: "user_1", title: "Audit submitted for review", message: "Grace Okafor submitted \"Warehouse 2 Spot Check\" for your verification.", type: "info", isRead: false, link: "/audits", createdAt: "2026-01-08T15:05:00Z" },
  { id: "ntf_2", orgId: "org_1", userId: "user_1", title: "Maintenance overdue", message: "\"Cisco Catalyst 9200 Switch\" firmware upgrade is due in 5 days.", type: "warning", isRead: false, link: "/maintenance", createdAt: "2026-01-13T08:00:00Z" },
  { id: "ntf_3", orgId: "org_1", userId: "user_1", title: "Asset reported lost", message: "\"iPhone 15 Pro\" (ACME-AST-0007) was marked lost during a stock count.", type: "danger", isRead: true, link: "/assets/ast_7", createdAt: "2026-01-14T11:20:00Z" },
];

