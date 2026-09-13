import type {
  Asset,
  AssetStatus,
  Audit,
  Category,
  CurrentUser,
  DashboardCharts,
  DashboardStats,
  Department,
  Location,
  MaintenanceRecord,
  Organization,
  User,
  Vendor,
  AppNotification,
  ActivityLogEntry,
} from "@/types";

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

export const mockDepartments: Department[] = [
  { id: "dept_1", orgId: "org_1", name: "Information Technology", code: "IT", description: null, managerId: "user_1", createdAt: "2026-01-10T09:00:00Z", updatedAt: "2026-01-10T09:00:00Z" },
  { id: "dept_2", orgId: "org_1", name: "Operations", code: "OPS", description: null, managerId: null, createdAt: "2026-01-10T09:00:00Z", updatedAt: "2026-01-10T09:00:00Z" },
  { id: "dept_3", orgId: "org_1", name: "Finance", code: "FIN", description: null, managerId: null, createdAt: "2026-01-10T09:00:00Z", updatedAt: "2026-01-10T09:00:00Z" },
];

export const mockLocations: Location[] = [
  { id: "loc_1", orgId: "org_1", name: "Lagos HQ", code: "LG-HQ", address: "12 Marina Rd", city: "Lagos", state: "Lagos", country: "Nigeria", zipCode: "101233", building: "Tower A", floor: "4", room: "410", isActive: true, createdAt: "2026-01-10T09:00:00Z", updatedAt: "2026-01-10T09:00:00Z" },
  { id: "loc_2", orgId: "org_1", name: "Abuja Branch", code: "ABJ-01", address: "5 Gwarinpa Ave", city: "Abuja", state: "FCT", country: "Nigeria", zipCode: "900108", building: null, floor: null, room: null, isActive: true, createdAt: "2026-01-10T09:00:00Z", updatedAt: "2026-01-10T09:00:00Z" },
  { id: "loc_3", orgId: "org_1", name: "Warehouse 2", code: "WH-02", address: "Km 12 Apapa Rd", city: "Lagos", state: "Lagos", country: "Nigeria", zipCode: "101212", building: null, floor: null, room: null, isActive: true, createdAt: "2026-01-10T09:00:00Z", updatedAt: "2026-01-10T09:00:00Z" },
];

export const mockCategories: Category[] = [
  { id: "cat_1", orgId: "org_1", name: "Laptops", code: "LAP", icon: "Laptop", color: "#3b82f6", description: null, usefulLifeMonths: 36, depreciationRate: "20.00", createdAt: "2026-01-10T09:00:00Z", updatedAt: "2026-01-10T09:00:00Z" },
  { id: "cat_2", orgId: "org_1", name: "Networking", code: "NET", icon: "Router", color: "#8b5cf6", description: null, usefulLifeMonths: 60, depreciationRate: "15.00", createdAt: "2026-01-10T09:00:00Z", updatedAt: "2026-01-10T09:00:00Z" },
  { id: "cat_3", orgId: "org_1", name: "Vehicles", code: "VEH", icon: "Truck", color: "#f59e0b", description: null, usefulLifeMonths: 96, depreciationRate: "10.00", createdAt: "2026-01-10T09:00:00Z", updatedAt: "2026-01-10T09:00:00Z" },
  { id: "cat_4", orgId: "org_1", name: "Furniture", code: "FUR", icon: "Armchair", color: "#10b981", description: null, usefulLifeMonths: 84, depreciationRate: "8.00", createdAt: "2026-01-10T09:00:00Z", updatedAt: "2026-01-10T09:00:00Z" },
];

export const mockVendors: Vendor[] = [
  { id: "vnd_1", orgId: "org_1", name: "Dell Technologies", code: "DELL", contactPerson: "Sarah Bello", email: "sales@dell-ng.com", phone: "+234 700 000 0001", website: "dell.com", address: null, notes: null, isActive: true, createdAt: "2026-01-10T09:00:00Z", updatedAt: "2026-01-10T09:00:00Z" },
  { id: "vnd_2", orgId: "org_1", name: "Cisco Systems", code: "CSCO", contactPerson: "Tunde Alabi", email: "ng-sales@cisco.com", phone: "+234 700 000 0002", website: "cisco.com", address: null, notes: null, isActive: true, createdAt: "2026-01-10T09:00:00Z", updatedAt: "2026-01-10T09:00:00Z" },
];

export const mockUsers: User[] = [
  mockCurrentUser,
  { id: "user_2", orgId: "org_1", name: "Elena Cruz", email: "elena@acmelogistics.com", role: "asset_manager", employeeId: "EMP-0002", title: "Asset Manager", departmentId: "dept_2", phone: null, avatarUrl: null, isActive: true, totpEnabled: true, createdAt: "2026-01-11T09:00:00Z", updatedAt: "2026-01-11T09:00:00Z" },
  { id: "user_3", orgId: "org_1", name: "Alex Turner", email: "alex@acmelogistics.com", role: "staff", employeeId: "EMP-0003", title: "Field Technician", departmentId: "dept_2", phone: null, avatarUrl: null, isActive: true, totpEnabled: false, createdAt: "2026-01-12T09:00:00Z", updatedAt: "2026-01-12T09:00:00Z" },
  { id: "user_4", orgId: "org_1", name: "Grace Okafor", email: "grace@acmelogistics.com", role: "staff", employeeId: "EMP-0004", title: "Warehouse Clerk", departmentId: "dept_2", phone: null, avatarUrl: null, isActive: true, totpEnabled: false, createdAt: "2026-01-13T09:00:00Z", updatedAt: "2026-01-13T09:00:00Z" },
];

const statuses: AssetStatus[] = ["available", "in_use", "in_maintenance", "reserved", "disposed", "lost"];

export const mockAssets: Asset[] = [
  { id: "ast_1", orgId: "org_1", assetTag: "ACME-AST-0001", name: "MacBook Pro 16\"", description: null, categoryId: "cat_1", categoryName: "Laptops", departmentId: "dept_1", departmentName: "Information Technology", locationId: "loc_1", locationName: "Lagos HQ", vendorId: "vnd_1", vendorName: "Dell Technologies", custodianId: "user_1", custodianName: "Emmanuel Ekop", status: "in_use", condition: "excellent", brand: "Apple", model: "MacBook Pro 16 M3", serialNumber: "C02XG2JYQ6LR", macAddress: null, ipAddress: null, purchaseDate: "2025-03-14T00:00:00Z", purchasePrice: "2850000.00", currentValue: "2280000.00", salvageValue: "285000.00", depreciationType: "straight_line", warrantyExpiry: "2027-03-14T00:00:00Z", warrantyNotes: null, barcodeData: "ACME-AST-0001", qrCodeData: null, imageUrl: null, customFields: {}, notes: null, createdAt: "2025-03-14T09:00:00Z", updatedAt: "2026-01-05T09:00:00Z" },
  { id: "ast_2", orgId: "org_1", assetTag: "ACME-AST-0002", name: "Dell Latitude 5440", description: null, categoryId: "cat_1", categoryName: "Laptops", departmentId: "dept_2", departmentName: "Operations", locationId: "loc_2", locationName: "Abuja Branch", vendorId: "vnd_1", vendorName: "Dell Technologies", custodianId: "user_2", custodianName: "Elena Cruz", status: "in_use", condition: "good", brand: "Dell", model: "Latitude 5440", serialNumber: "DL5440X921", macAddress: null, ipAddress: null, purchaseDate: "2025-06-02T00:00:00Z", purchasePrice: "980000.00", currentValue: "784000.00", salvageValue: "98000.00", depreciationType: "straight_line", warrantyExpiry: "2027-06-02T00:00:00Z", warrantyNotes: null, barcodeData: "ACME-AST-0002", qrCodeData: null, imageUrl: null, customFields: {}, notes: null, createdAt: "2025-06-02T09:00:00Z", updatedAt: "2025-12-20T09:00:00Z" },
  { id: "ast_3", orgId: "org_1", assetTag: "ACME-AST-0003", name: "Cisco Catalyst 9200 Switch", description: null, categoryId: "cat_2", categoryName: "Networking", departmentId: "dept_1", departmentName: "Information Technology", locationId: "loc_1", locationName: "Lagos HQ", vendorId: "vnd_2", vendorName: "Cisco Systems", custodianId: null, custodianName: undefined, status: "available", condition: "excellent", brand: "Cisco", model: "Catalyst 9200-24P", serialNumber: "FCW2419L0K2", macAddress: null, ipAddress: "10.0.4.1", purchaseDate: "2025-02-20T00:00:00Z", purchasePrice: "1450000.00", currentValue: "1305000.00", salvageValue: "145000.00", depreciationType: "straight_line", warrantyExpiry: "2030-02-20T00:00:00Z", warrantyNotes: null, barcodeData: "ACME-AST-0003", qrCodeData: null, imageUrl: null, customFields: {}, notes: null, createdAt: "2025-02-20T09:00:00Z", updatedAt: "2025-11-01T09:00:00Z" },
  { id: "ast_4", orgId: "org_1", assetTag: "ACME-AST-0004", name: "Toyota Hiace Van", description: null, categoryId: "cat_3", categoryName: "Vehicles", departmentId: "dept_2", departmentName: "Operations", locationId: "loc_3", locationName: "Warehouse 2", vendorId: null, vendorName: undefined, custodianId: "user_4", custodianName: "Grace Okafor", status: "in_maintenance", condition: "fair", brand: "Toyota", model: "Hiace 2023", serialNumber: "JTFSS22P9N0123456", macAddress: null, ipAddress: null, purchaseDate: "2023-08-01T00:00:00Z", purchasePrice: "22000000.00", currentValue: "15400000.00", salvageValue: "2200000.00", depreciationType: "straight_line", warrantyExpiry: null, warrantyNotes: null, barcodeData: "ACME-AST-0004", qrCodeData: null, imageUrl: null, customFields: {}, notes: "Due for brake service", createdAt: "2023-08-01T09:00:00Z", updatedAt: "2026-01-08T09:00:00Z" },
  { id: "ast_5", orgId: "org_1", assetTag: "ACME-AST-0005", name: "Office Desk Set (x1)", description: null, categoryId: "cat_4", categoryName: "Furniture", departmentId: "dept_3", departmentName: "Finance", locationId: "loc_1", locationName: "Lagos HQ", vendorId: null, vendorName: undefined, custodianId: null, custodianName: undefined, status: "available", condition: "good", brand: null, model: null, serialNumber: null, macAddress: null, ipAddress: null, purchaseDate: "2024-11-10T00:00:00Z", purchasePrice: "180000.00", currentValue: "144000.00", salvageValue: "18000.00", depreciationType: "straight_line", warrantyExpiry: null, warrantyNotes: null, barcodeData: "ACME-AST-0005", qrCodeData: null, imageUrl: null, customFields: {}, notes: null, createdAt: "2024-11-10T09:00:00Z", updatedAt: "2024-11-10T09:00:00Z" },
  { id: "ast_6", orgId: "org_1", assetTag: "ACME-AST-0006", name: "HP LaserJet Pro M404", description: null, categoryId: "cat_1", categoryName: "Laptops", departmentId: "dept_3", departmentName: "Finance", locationId: "loc_1", locationName: "Lagos HQ", vendorId: null, vendorName: undefined, custodianId: null, custodianName: undefined, status: "disposed", condition: "damaged", brand: "HP", model: "LaserJet Pro M404dn", serialNumber: "VNC3B12345", macAddress: null, ipAddress: null, purchaseDate: "2021-05-15T00:00:00Z", purchasePrice: "210000.00", currentValue: "0.00", salvageValue: "0.00", depreciationType: "straight_line", warrantyExpiry: null, warrantyNotes: null, barcodeData: "ACME-AST-0006", qrCodeData: null, imageUrl: null, customFields: {}, notes: "Beyond repair, disposed Jan 2026", createdAt: "2021-05-15T09:00:00Z", updatedAt: "2026-01-02T09:00:00Z" },
  { id: "ast_7", orgId: "org_1", assetTag: "ACME-AST-0007", name: "iPhone 15 Pro", description: null, categoryId: "cat_1", categoryName: "Laptops", departmentId: "dept_2", departmentName: "Operations", locationId: "loc_3", locationName: "Warehouse 2", vendorId: null, vendorName: undefined, custodianId: "user_3", custodianName: "Alex Turner", status: "lost", condition: "good", brand: "Apple", model: "iPhone 15 Pro", serialNumber: "F2LN8X3QGH", macAddress: null, ipAddress: null, purchaseDate: "2025-09-01T00:00:00Z", purchasePrice: "1150000.00", currentValue: "977500.00", salvageValue: "115000.00", depreciationType: "straight_line", warrantyExpiry: "2026-09-01T00:00:00Z", warrantyNotes: null, barcodeData: "ACME-AST-0007", qrCodeData: null, imageUrl: null, customFields: {}, notes: "Reported missing during Jan stock count", createdAt: "2025-09-01T09:00:00Z", updatedAt: "2026-01-14T09:00:00Z" },
  { id: "ast_8", orgId: "org_1", assetTag: "ACME-AST-0008", name: "Conference Room Projector", description: null, categoryId: "cat_2", categoryName: "Networking", departmentId: "dept_1", departmentName: "Information Technology", locationId: "loc_2", locationName: "Abuja Branch", vendorId: null, vendorName: undefined, custodianId: null, custodianName: undefined, status: "reserved", condition: "good", brand: "Epson", model: "EB-X06", serialNumber: "X06AB98213", macAddress: null, ipAddress: null, purchaseDate: "2024-04-18T00:00:00Z", purchasePrice: "320000.00", currentValue: "224000.00", salvageValue: "32000.00", depreciationType: "straight_line", warrantyExpiry: "2026-04-18T00:00:00Z", warrantyNotes: null, barcodeData: "ACME-AST-0008", qrCodeData: null, imageUrl: null, customFields: {}, notes: null, createdAt: "2024-04-18T09:00:00Z", updatedAt: "2025-10-11T09:00:00Z" },
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

export const mockActivity: ActivityLogEntry[] = [
  { id: "act_1", orgId: "org_1", userId: "user_4", userName: "Grace Okafor", action: "audit.submitted", entityType: "audit", entityId: "adt_2", entityName: "Warehouse 2 Spot Check", details: {}, ipAddress: null, createdAt: "2026-01-08T15:05:00Z" },
  { id: "act_2", orgId: "org_1", userId: "user_2", userName: "Elena Cruz", action: "asset.checked_out", entityType: "asset", entityId: "ast_2", entityName: "Dell Latitude 5440", details: {}, ipAddress: null, createdAt: "2026-01-09T10:12:00Z" },
  { id: "act_3", orgId: "org_1", userId: "user_1", userName: "Emmanuel Ekop", action: "audit.verified", entityType: "audit", entityId: "adt_3", entityName: "December 2025 Full Count", details: {}, ipAddress: null, createdAt: "2025-12-12T09:00:00Z" },
  { id: "act_4", orgId: "org_1", userId: "user_4", userName: "Grace Okafor", action: "asset.status_changed", entityType: "asset", entityId: "ast_4", entityName: "Toyota Hiace Van", details: { from: "available", to: "in_maintenance" }, ipAddress: null, createdAt: "2026-01-08T09:00:00Z" },
  { id: "act_5", orgId: "org_1", userId: "user_3", userName: "Alex Turner", action: "asset.reported_lost", entityType: "asset", entityId: "ast_7", entityName: "iPhone 15 Pro", details: {}, ipAddress: null, createdAt: "2026-01-14T11:20:00Z" },
];

export function buildMockDashboardStats(): DashboardStats {
  const counts = statuses.reduce<Record<AssetStatus, number>>((acc, s) => {
    acc[s] = mockAssets.filter((a) => a.status === s).length;
    return acc;
  }, {} as Record<AssetStatus, number>);
  const totalValue = mockAssets.reduce((sum, a) => sum + Number(a.currentValue ?? 0), 0);

  return {
    assets: {
      total: mockAssets.length,
      available: counts.available,
      inUse: counts.in_use,
      inMaintenance: counts.in_maintenance,
      disposed: counts.disposed,
      totalValue: totalValue.toFixed(2),
    },
    activeUsers: mockUsers.filter((u) => u.isActive).length,
    maintenanceDue: mockMaintenanceRecords.filter((m) => m.status === "scheduled").length,
  };
}

export function buildMockDashboardCharts(): DashboardCharts {
  const byCategory = mockCategories.map((c) => ({
    categoryId: c.id,
    categoryName: c.name,
    count: mockAssets.filter((a) => a.categoryId === c.id).length,
  }));
  const byStatus = statuses.map((status) => ({
    status,
    count: mockAssets.filter((a) => a.status === status).length,
  }));
  return { byCategory, byStatus };
}
