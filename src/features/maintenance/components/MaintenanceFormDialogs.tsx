import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/ui/form";
import { ApiError } from "@/lib/http-error";
import { useAssetsQuery } from "@/features/assets/api";
import { useVendorsQuery } from "@/features/catalog/api";
import { useCreateMaintenanceMutation, useUpdateMaintenanceMutation } from "@/features/maintenance/api";
import type { MaintenanceRecord } from "@/types";

const NONE = "__none__";

const MAINTENANCE_TYPE_OPTIONS = [
  { value: "preventive", label: "Preventive" },
  { value: "corrective", label: "Corrective" },
  { value: "calibration", label: "Calibration" },
  { value: "inspection", label: "Inspection" },
  { value: "upgrade", label: "Upgrade" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export const MAINTENANCE_STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_parts", label: "Waiting Parts" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

/**
 * Asset picker shared by both dialogs: a plain text filter above a Select, since this project's
 * Select primitive has no built-in search and a combobox component isn't in the registry yet.
 * Fetches a flat page of assets (pageSize 200) rather than paginating - fine for the org sizes
 * this app targets today; a searchable server-side asset picker is a reasonable follow-up if org
 * asset counts grow past that.
 */
function AssetPickerField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const [search, setSearch] = useState("");
  const assets = useAssetsQuery({ pageSize: 200 });
  const rows = assets.data?.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((a) => a.name.toLowerCase().includes(q) || a.assetTag.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <FormField label="Asset" htmlFor="assetId" required error={error}>
      <div className="space-y-1.5">
        <Input
          placeholder="Search by name or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs"
        />
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id="assetId" className="w-full">
            <SelectValue placeholder={assets.isLoading ? "Loading assets..." : "Select asset"} />
          </SelectTrigger>
          <SelectContent>
            {filtered.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No matching assets.</div>
            ) : (
              filtered.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} ({a.assetTag})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </FormField>
  );
}

function VendorField({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const vendors = useVendorsQuery();
  return (
    <FormField label="Vendor" htmlFor="vendorId">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="vendorId" className="w-full">
          <SelectValue placeholder="No vendor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No vendor</SelectItem>
          {vendors.data?.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

const createSchema = z.object({
  assetId: z.string().min(1, "Asset is required"),
  title: z.string().trim().min(1, "Title is required").max(255),
  description: z.string().trim().optional(),
  maintenanceType: z.enum(["preventive", "corrective", "calibration", "inspection", "upgrade"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  scheduledDate: z.string().min(1, "Scheduled date is required"),
  vendorId: z.string(),
  technicianName: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;

export function CreateMaintenanceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const createMaintenance = useCreateMaintenanceMutation();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      assetId: "",
      title: "",
      description: "",
      maintenanceType: "preventive",
      priority: "medium",
      scheduledDate: "",
      vendorId: NONE,
      technicianName: "",
      notes: "",
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
      setFormError(null);
    }
    onOpenChange(next);
  }

  const onSubmit = async (values: CreateFormValues) => {
    setFormError(null);
    try {
      await createMaintenance.mutateAsync({
        assetId: values.assetId,
        title: values.title,
        description: values.description || undefined,
        maintenanceType: values.maintenanceType,
        priority: values.priority,
        scheduledDate: values.scheduledDate,
        vendorId: values.vendorId === NONE ? undefined : values.vendorId,
        technicianName: values.technicianName || undefined,
        notes: values.notes || undefined,
      });
      toast.success("Maintenance scheduled");
      handleOpenChange(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't schedule this maintenance. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule maintenance</DialogTitle>
          <DialogDescription>Create a maintenance record for an asset.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller control={control} name="assetId" render={({ field }) => (
            <AssetPickerField value={field.value} onChange={field.onChange} error={errors.assetId?.message} />
          )} />

          <FormField label="Title" htmlFor="title" required error={errors.title?.message}>
            <Input id="title" placeholder="Brake pad replacement" {...register("title")} />
          </FormField>

          <FormField label="Description" htmlFor="description" error={errors.description?.message}>
            <Textarea id="description" rows={2} placeholder="Optional details" {...register("description")} />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Type" htmlFor="maintenanceType">
              <Controller control={control} name="maintenanceType" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="maintenanceType" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>

            <FormField label="Priority" htmlFor="priority">
              <Controller control={control} name="priority" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Scheduled date" htmlFor="scheduledDate" required error={errors.scheduledDate?.message}>
              <Input id="scheduledDate" type="date" {...register("scheduledDate")} />
            </FormField>

            <FormField label="Technician" htmlFor="technicianName">
              <Input id="technicianName" placeholder="Optional" {...register("technicianName")} />
            </FormField>
          </div>

          <Controller control={control} name="vendorId" render={({ field }) => (
            <VendorField value={field.value} onChange={field.onChange} />
          )} />

          <FormField label="Notes" htmlFor="notes">
            <Textarea id="notes" rows={2} placeholder="Optional" {...register("notes")} />
          </FormField>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              Schedule maintenance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit / complete
// ---------------------------------------------------------------------------

const editSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255),
  description: z.string().trim().optional(),
  status: z.enum(["scheduled", "in_progress", "waiting_parts", "completed", "cancelled"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  startDate: z.string().optional(),
  completedDate: z.string().optional(),
  cost: z.string().optional(),
  partsUsed: z.string().trim().optional(),
  technicianName: z.string().trim().optional(),
  vendorId: z.string(),
  notes: z.string().trim().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

function defaultsFromRecord(record: MaintenanceRecord): EditFormValues {
  return {
    title: record.title,
    description: record.description ?? "",
    status: record.status,
    priority: record.priority,
    startDate: toDateInputValue(record.startDate),
    completedDate: toDateInputValue(record.completedDate),
    cost: record.cost ?? "",
    partsUsed: record.partsUsed ?? "",
    technicianName: record.technicianName ?? "",
    vendorId: record.vendorId ?? NONE,
    notes: record.notes ?? "",
  };
}

export function EditMaintenanceDialog({
  record,
  onOpenChange,
}: {
  record: MaintenanceRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const updateMaintenance = useUpdateMaintenanceMutation();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    values: record ? defaultsFromRecord(record) : undefined,
  });

  function handleOpenChange(next: boolean) {
    if (!next) setFormError(null);
    onOpenChange(next);
  }

  const onSubmit = async (values: EditFormValues) => {
    if (!record) return;
    setFormError(null);
    try {
      await updateMaintenance.mutateAsync({
        id: record.id,
        input: {
          title: values.title,
          description: values.description || undefined,
          status: values.status,
          priority: values.priority,
          startDate: values.startDate || undefined,
          completedDate: values.completedDate || undefined,
          cost: values.cost || undefined,
          partsUsed: values.partsUsed || undefined,
          technicianName: values.technicianName || undefined,
          vendorId: values.vendorId === NONE ? undefined : values.vendorId,
          notes: values.notes || undefined,
        },
      });
      toast.success("Maintenance record updated");
      handleOpenChange(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't update this maintenance record. Please try again.");
    }
  };

  return (
    <Dialog open={!!record} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Update maintenance</DialogTitle>
          <DialogDescription>{record?.title}</DialogDescription>
        </DialogHeader>
        {record && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Title" htmlFor="edit-title" required error={errors.title?.message}>
              <Input id="edit-title" {...register("title")} />
            </FormField>

            <FormField label="Description" htmlFor="edit-description">
              <Textarea id="edit-description" rows={2} {...register("description")} />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Status" htmlFor="edit-status">
                <Controller control={control} name="status" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="edit-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAINTENANCE_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>

              <FormField label="Priority" htmlFor="edit-priority">
                <Controller control={control} name="priority" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="edit-priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Start date" htmlFor="edit-startDate">
                <Input id="edit-startDate" type="date" {...register("startDate")} />
              </FormField>

              <FormField label="Completed date" htmlFor="edit-completedDate">
                <Input id="edit-completedDate" type="date" {...register("completedDate")} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Cost" htmlFor="edit-cost">
                <Input id="edit-cost" type="number" step="0.01" placeholder="0.00" {...register("cost")} />
              </FormField>

              <FormField label="Technician" htmlFor="edit-technicianName">
                <Input id="edit-technicianName" {...register("technicianName")} />
              </FormField>
            </div>

            <FormField label="Parts used" htmlFor="edit-partsUsed">
              <Input id="edit-partsUsed" placeholder="Optional" {...register("partsUsed")} />
            </FormField>

            <Controller control={control} name="vendorId" render={({ field }) => (
              <VendorField value={field.value} onChange={field.onChange} />
            )} />

            <FormField label="Notes" htmlFor="edit-notes">
              <Textarea id="edit-notes" rows={2} {...register("notes")} />
            </FormField>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-1.5">
                {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
