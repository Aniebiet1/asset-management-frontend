import type { CurrentUser, Organization, AppNotification } from "@/types";

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

export const mockNotifications: AppNotification[] = [
  { id: "ntf_1", orgId: "org_1", userId: "user_1", title: "Audit submitted for review", message: "Grace Okafor submitted \"Warehouse 2 Spot Check\" for your verification.", type: "info", isRead: false, link: "/audits", createdAt: "2026-01-08T15:05:00Z" },
  { id: "ntf_2", orgId: "org_1", userId: "user_1", title: "Maintenance overdue", message: "\"Cisco Catalyst 9200 Switch\" firmware upgrade is due in 5 days.", type: "warning", isRead: false, link: "/maintenance", createdAt: "2026-01-13T08:00:00Z" },
  { id: "ntf_3", orgId: "org_1", userId: "user_1", title: "Asset reported lost", message: "\"iPhone 15 Pro\" (ACME-AST-0007) was marked lost during a stock count.", type: "danger", isRead: true, link: "/assets/ast_7", createdAt: "2026-01-14T11:20:00Z" },
];

