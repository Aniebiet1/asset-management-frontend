import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/ui/form";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/http-error";
import { useCategoriesQuery, useLocationsQuery, useDepartmentsQuery, useVendorsQuery } from "@/features/catalog/api";
import { useCreateAssetMutation, useUpdateAssetMutation, useUploadFileMutation } from "@/features/assets/api";
import type { Asset, User } from "@/types";

const NONE = "__none__";

const assetFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  description: z.string().trim().optional(),
  categoryId: z.string().min(1, "Category is required"),
  departmentId: z.string(),
  locationId: z.string().min(1, "Location is required"),
  vendorId: z.string(),
  custodianId: z.string(),
  status: z.string(),
  condition: z.string(),
  brand: z.string().trim().optional(),
  model: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  macAddress: z.string().trim().optional(),
  ipAddress: z.string().trim().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.string().optional(),
  currentValue: z.string().optional(),
  salvageValue: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  warrantyNotes: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

function defaultsFromAsset(asset: Asset | undefined): AssetFormValues {
  return {
    name: asset?.name ?? "",
    description: asset?.description ?? "",
    categoryId: asset?.categoryId ?? "",
    departmentId: asset?.departmentId ?? NONE,
    locationId: asset?.locationId ?? "",
    vendorId: asset?.vendorId ?? NONE,
    custodianId: asset?.custodianId ?? NONE,
    status: asset?.status ?? "available",
    condition: asset?.condition ?? "good",
    brand: asset?.brand ?? "",
    model: asset?.model ?? "",
    serialNumber: asset?.serialNumber ?? "",
    macAddress: asset?.macAddress ?? "",
    ipAddress: asset?.ipAddress ?? "",
    purchaseDate: asset?.purchaseDate ? asset.purchaseDate.slice(0, 10) : "",
    purchasePrice: asset?.purchasePrice ?? "",
    currentValue: asset?.currentValue ?? "",
    salvageValue: asset?.salvageValue ?? "",
    warrantyExpiry: asset?.warrantyExpiry ? asset.warrantyExpiry.slice(0, 10) : "",
    warrantyNotes: asset?.warrantyNotes ?? "",
    notes: asset?.notes ?? "",
  };
}

function buildPayload(values: AssetFormValues): Record<string, unknown> {
  return {
    name: values.name,
    description: values.description || undefined,
    categoryId: values.categoryId,
    departmentId: values.departmentId === NONE ? undefined : values.departmentId,
    locationId: values.locationId,
    vendorId: values.vendorId === NONE ? undefined : values.vendorId,
    custodianId: values.custodianId === NONE ? undefined : values.custodianId,
    status: values.status,
    condition: values.condition,
    brand: values.brand || undefined,
    model: values.model || undefined,
    serialNumber: values.serialNumber || undefined,
    macAddress: values.macAddress || undefined,
    ipAddress: values.ipAddress || undefined,
    purchaseDate: values.purchaseDate || undefined,
    purchasePrice: values.purchasePrice || undefined,
    currentValue: values.currentValue || undefined,
    salvageValue: values.salvageValue || undefined,
    warrantyExpiry: values.warrantyExpiry || undefined,
    warrantyNotes: values.warrantyNotes || undefined,
    notes: values.notes || undefined,
  };
}

const statusOptions = [
  { value: "available", label: "Available" },
  { value: "in_use", label: "In Use" },
  { value: "in_maintenance", label: "In Maintenance" },
  { value: "reserved", label: "Reserved" },
  { value: "disposed", label: "Disposed" },
  { value: "lost", label: "Lost / Missing" },
];

const conditionOptions = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "damaged", label: "Damaged" },
];

export function AssetForm({ asset }: { asset?: Asset }) {
  const navigate = useNavigate();
  const isEdit = !!asset;

  const categories = useCategoriesQuery();
  const locations = useLocationsQuery();
  const departments = useDepartmentsQuery();
  const vendors = useVendorsQuery();
  const people = useQuery({
    queryKey: ["people", "list"],
    queryFn: () => apiFetch<{ data: User[] }>("/people").then((r) => r.data),
  });

  const createAsset = useCreateAssetMutation();
  const updateAsset = useUpdateAssetMutation(asset?.id ?? "");
  const uploadFile = useUploadFileMutation();

  const [imageUrl, setImageUrl] = useState<string | null>(asset?.imageUrl ?? null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: defaultsFromAsset(asset),
  });

  useEffect(() => {
    reset(defaultsFromAsset(asset));
    setImageUrl(asset?.imageUrl ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.id]);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const uploaded = await uploadFile.mutateAsync(file);
      setImageUrl(uploaded.url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't upload that image.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  const onSubmit = async (values: AssetFormValues) => {
    setFormError(null);
    try {
      const payload = { ...buildPayload(values), imageUrl: imageUrl ?? undefined };
      if (isEdit && asset) {
        await updateAsset.mutateAsync(payload);
        toast.success("Asset updated");
        navigate(`/assets/${asset.id}`);
      } else {
        const created = await createAsset.mutateAsync(payload);
        toast.success("Asset created");
        navigate(`/assets/${created.id}`);
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't save this asset. Please try again.");
    }
  };

  const noCatalogYet = !categories.isLoading && !locations.isLoading && (categories.data?.length === 0 || locations.data?.length === 0);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {noCatalogYet && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          You need at least one category and one location before you can register an asset. Add them under Settings &gt; Catalog first.
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold text-foreground">Basic information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Name" htmlFor="name" required error={errors.name?.message} className="sm:col-span-2">
              <Input id="name" placeholder="MacBook Pro 16&quot;" {...register("name")} />
            </FormField>

            <FormField label="Category" htmlFor="categoryId" required error={errors.categoryId?.message}>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="categoryId">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.data?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Location" htmlFor="locationId" required error={errors.locationId?.message}>
              <Controller
                control={control}
                name="locationId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="locationId">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.data?.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Department" htmlFor="departmentId">
              <Controller
                control={control}
                name="departmentId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="departmentId">
                      <SelectValue placeholder="No department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No department</SelectItem>
                      {departments.data?.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Vendor" htmlFor="vendorId">
              <Controller
                control={control}
                name="vendorId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="vendorId">
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
                )}
              />
            </FormField>

            <FormField label="Custodian" htmlFor="custodianId">
              <Controller
                control={control}
                name="custodianId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="custodianId">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
                      {people.data?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Status" htmlFor="status">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Condition" htmlFor="condition">
              <Controller
                control={control}
                name="condition"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="condition">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Description" htmlFor="description" className="sm:col-span-2">
              <Textarea id="description" {...register("description")} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold text-foreground">Specifications</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Brand" htmlFor="brand">
              <Input id="brand" {...register("brand")} />
            </FormField>
            <FormField label="Model" htmlFor="model">
              <Input id="model" {...register("model")} />
            </FormField>
            <FormField label="Serial number" htmlFor="serialNumber">
              <Input id="serialNumber" {...register("serialNumber")} />
            </FormField>
            <FormField label="MAC address" htmlFor="macAddress">
              <Input id="macAddress" {...register("macAddress")} />
            </FormField>
            <FormField label="IP address" htmlFor="ipAddress">
              <Input id="ipAddress" {...register("ipAddress")} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold text-foreground">Purchase and warranty</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Purchase date" htmlFor="purchaseDate">
              <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
            </FormField>
            <FormField label="Purchase price" htmlFor="purchasePrice">
              <Input id="purchasePrice" type="number" step="0.01" {...register("purchasePrice")} />
            </FormField>
            <FormField label="Salvage value" htmlFor="salvageValue">
              <Input id="salvageValue" type="number" step="0.01" {...register("salvageValue")} />
            </FormField>
            <FormField label="Current value" htmlFor="currentValue" hint="Leave blank to let depreciation compute it.">
              <Input id="currentValue" type="number" step="0.01" {...register("currentValue")} />
            </FormField>
            <FormField label="Warranty expiry" htmlFor="warrantyExpiry">
              <Input id="warrantyExpiry" type="date" {...register("warrantyExpiry")} />
            </FormField>
            <FormField label="Warranty notes" htmlFor="warrantyNotes">
              <Input id="warrantyNotes" {...register("warrantyNotes")} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold text-foreground">Photo</h2>
          <div className="flex items-center gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30">
              {imageUrl ? (
                <img src={imageUrl} alt="Asset" className="size-full object-cover" />
              ) : (
                <span className="text-[10px] text-muted-foreground">No image</span>
              )}
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage}>
                {isUploadingImage ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                Upload photo
              </Button>
              <p className="mt-1 text-[11px] text-muted-foreground">PNG or JPG, up to 20MB.</p>
            </div>
          </div>

          <FormField label="Notes" htmlFor="notes">
            <Textarea id="notes" {...register("notes")} />
          </FormField>
        </CardContent>
      </Card>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate(isEdit && asset ? `/assets/${asset.id}` : "/assets")}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-1.5">
          {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
          {isEdit ? "Save changes" : "Create asset"}
        </Button>
      </div>
    </form>
  );
}
