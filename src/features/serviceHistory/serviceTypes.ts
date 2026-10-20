import type { MaintenanceType, ServiceEntryType } from "@/types";

export const SERVICE_TYPE_OPTIONS = [
  { value: "repair", label: "Repair" },
  { value: "service", label: "Service" },
  { value: "inspection", label: "Inspection" },
] as const satisfies readonly { value: ServiceEntryType; label: string }[];

/** Maps the stored maintenance type back to the three words this feature uses (backend serviceHistory.schema.ts). */
export function serviceTypeOf(type: MaintenanceType): ServiceEntryType {
  if (type === "corrective") return "repair";
  if (type === "inspection") return "inspection";
  return "service";
}

/** Label for display, keeping calibration/upgrade records (logged from the Maintenance page) recognizable. */
export function serviceTypeLabel(type: MaintenanceType): string {
  if (type === "calibration") return "Calibration";
  if (type === "upgrade") return "Upgrade";
  return SERVICE_TYPE_OPTIONS.find((o) => o.value === serviceTypeOf(type))!.label;
}
