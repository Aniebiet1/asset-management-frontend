import type { CurrentUser, Organization } from "@/types";

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

