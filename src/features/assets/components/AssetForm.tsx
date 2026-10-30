import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles, Upload, Layers } from "lucide-react";
import JsBarcode from "jsbarcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormField } from "@/components/ui/form";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/http-error";
import { compressImage } from "@/lib/compressImage";
import { generateRandomCode } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import { useCategoriesQuery, useLocationsQuery, useDepartmentsQuery, useVendorsQuery, useSubsidiariesQuery, useBranchesQuery } from "@/features/catalog/api";
import { useCreateAssetMutation, useUpdateAssetMutation, useUploadFileMutation, useAssetTagPreviewQuery } from "@/features/assets/api";
import { DuplicateAssetPicker } from "@/features/assets/components/DuplicateAssetPicker";
import type { Asset, User } from "@/types";

const NONE = "__none__";

function generateAssetTag(orgSlug: string | undefined): string {
  return generateRandomCode(`${(orgSlug || "ORG").toUpperCase()}-AST`, 5);
}

function AssetTagBarcode({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value.trim()) return;
    try {
      JsBarcode(canvasRef.current, value, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        height: 36,
        width: 1.4,
      });
    } catch {
      // Mid-typing the value can briefly contain characters CODE128 rejects; the canvas just
      // keeps showing its last valid render until the input settles.
    }
  }, [value]);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">Barcode preview</p>
        <p className="text-[11px] text-muted-foreground">Code-128 format, used for scanning and printed labels.</p>
      </div>
      <canvas ref={canvasRef} className="h-9 max-w-[180px] shrink-0" />
    </div>
  );
}

const assetFormSchema = z.object({
  // Required when the legacy free-text flow is showing this field; in the structured flow it
  // stays populated with an unused default (the field isn't rendered there), see buildPayload.
  assetTag: z.string().trim().min(1, "Asset tag is required").max(100),
  name: z.string().trim().min(1, "Name is required").max(255),
  description: z.string().trim().optional(),
  categoryId: z.string().min(1, "Asset type is required"),
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

  subsidiaryId: z.string().optional(),
  branchId: z.string().optional(),
}).superRefine((values, ctx) => {
  // An in-use asset is in someone's hands, so it has to say whose. The backend refuses to release
  // the custodian of an in-use asset too (assets.service.ts updateAsset) - this is the same rule,
  // caught before the request so the field itself can explain it.
  if (values.status === "in_use" && values.custodianId === NONE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["custodianId"],
      message: "An asset that is in use needs a custodian. Check it in to release the custodian, or change the status.",
    });
  }
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

function defaultsFromAsset(asset: Asset | undefined, generatedTag: string): AssetFormValues {
  return {
    assetTag: asset?.assetTag ?? generatedTag,
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
    subsidiaryId: asset?.subsidiaryId ?? "",
    branchId: asset?.branchId ?? "",
  };
}

function buildPayload(values: AssetFormValues, structured: boolean, batchIndex: number | undefined): Record<string, unknown> {
  const base: Record<string, unknown> = {
    name: values.name,
    description: values.description || undefined,
    categoryId: values.categoryId,
    departmentId: values.departmentId === NONE ? undefined : values.departmentId,
    locationId: values.locationId,
    vendorId: values.vendorId === NONE ? undefined : values.vendorId,
    // null, not undefined: the backend's PUT is a partial update, so an absent key means "leave it"
    // while null is what actually releases the custodian.
    custodianId: values.custodianId === NONE ? null : values.custodianId,
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

  if (structured) {
    // The backend assembles and assigns the tag - assetTag is intentionally omitted here.
    return {
      ...base,
      subsidiaryId: values.subsidiaryId,
      branchId: values.branchId,
      isBatch: batchIndex !== undefined || undefined,
      batchIndex,
    };
  }

  return { ...base, assetTag: values.assetTag };
}

const statusOptions = [
  { value: "available", label: "Available" },
  { value: "in_use", label: "In Use" },
  { value: "in_maintenance", label: "In Maintenance" },
  { value: "reserved", label: "Reserved" },
  { value: "disposed", label: "Disposed" },
  { value: "lost", label: "Lost / Missing" },
];

/** "Under maintenance" is included because the system sets it while a job is open on the asset,
 * and a Select has to be able to render its own value - it's deliberately last. */
const conditionOptions = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "damaged", label: "Damaged" },
  { value: "maintenance", label: "Under Maintenance" },
];

export function AssetForm({ asset }: { asset?: Asset }) {
  const navigate = useNavigate();
  const isEdit = !!asset;
  const orgSlug = useAuthStore((s) => s.org?.slug);

  const categories = useCategoriesQuery();
  const locations = useLocationsQuery();
  const departments = useDepartmentsQuery();
  const vendors = useVendorsQuery();
  const subsidiaries = useSubsidiariesQuery();
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
  const [generatedTag] = useState(() => generateAssetTag(orgSlug));
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateParent, setDuplicateParent] = useState<Asset | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: defaultsFromAsset(asset, generatedTag),
  });

  const watchedTag = useWatch({ control, name: "assetTag" });
  const watchedSubsidiaryId = useWatch({ control, name: "subsidiaryId" });
  const watchedBranchId = useWatch({ control, name: "branchId" });
  const watchedCategoryId = useWatch({ control, name: "categoryId" });
  const watchedPurchaseDate = useWatch({ control, name: "purchaseDate" });
  const watchedStatus = useWatch({ control, name: "status" });
  const custodianLocked = watchedStatus === "in_use";

  const branches = useBranchesQuery();

  // Structured flow activates once the org has configured at least one subsidiary; orgs that
  // haven't yet keep today's free-text tag input untouched (see BUILD_PLAN.md's Phase 3 note).
  const hasStructuredFlow = !subsidiaries.isLoading && (subsidiaries.data?.length ?? 0) > 0;

  const preview = useAssetTagPreviewQuery({
    subsidiaryId: watchedSubsidiaryId,
    branchId: watchedBranchId,
    categoryId: watchedCategoryId,
    purchaseDate: watchedPurchaseDate,
    isBatch: !!duplicateParent,
    batchIndex: duplicateParent?.tagIndex ?? undefined,
  });

  useEffect(() => {
    reset(defaultsFromAsset(asset, generatedTag));
    setImageUrl(asset?.imageUrl ?? null);
    setIsDuplicate(false);
    setDuplicateParent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.id]);

  // A picked duplicate-of target is scoped to one asset type - changing the type invalidates it.
  useEffect(() => {
    setDuplicateParent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCategoryId]);

  function handleRegenerateTag() {
    setValue("assetTag", generateAssetTag(orgSlug), { shouldValidate: true, shouldDirty: true });
  }

  function handleSelectDuplicateParent(parent: Asset) {
    setDuplicateParent(parent);
    // Convenience default for the new item's own purchase date - "same invoice" duplicates
    // typically share it, but it stays fully editable; subsidiary/branch are left for the user to
    // pick themselves since setting them here would race the "reset branch on subsidiary change"
    // effect below.
    if (!watchedPurchaseDate && parent.purchaseDate) setValue("purchaseDate", parent.purchaseDate.slice(0, 10));
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const compressed = await compressImage(file);
      const uploaded = await uploadFile.mutateAsync(compressed);
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

    if (hasStructuredFlow && !isEdit) {
      if (!values.subsidiaryId || !values.branchId || !values.categoryId || !values.purchaseDate) {
        setFormError("Subsidiary, branch, asset type, and purchase date are all required to generate a tag.");
        return;
      }
    }

    try {
      const batchIndex = isDuplicate ? (duplicateParent?.tagIndex ?? undefined) : undefined;
      if (isDuplicate && batchIndex === undefined) {
        setFormError("Search for and select the existing item this is a duplicate of.");
        return;
      }

      const payload = {
        ...buildPayload(values, hasStructuredFlow && !isEdit, batchIndex),
        imageUrl: imageUrl ?? undefined,
      };
      if (isEdit && asset) {
        await updateAsset.mutateAsync(payload);
        toast.success("Asset updated");
        navigate(`/assets/${asset.id}`);
        return;
      }

      const created = await createAsset.mutateAsync(payload);
      toast.success("Asset created");
      navigate(`/assets/${created.id}`);
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
        <CardContent className="p-0">
          <Tabs defaultValue="general">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="specs">Specifications</TabsTrigger>
              <TabsTrigger value="purchase">Purchase &amp; warranty</TabsTrigger>
              <TabsTrigger value="photo">Photo &amp; notes</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 p-4">
              {!isEdit && !hasStructuredFlow && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="assetTag">
                        Asset tag <span className="text-destructive">*</span>
                      </Label>
                      <button
                        type="button"
                        onClick={handleRegenerateTag}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        <Sparkles className="size-3" />
                        Regenerate
                      </button>
                    </div>
                    <Input id="assetTag" className="font-mono uppercase" {...register("assetTag")} />
                    {errors.assetTag && <p className="text-xs text-destructive">{errors.assetTag.message}</p>}
                  </div>
                  <AssetTagBarcode value={watchedTag ?? ""} />
                </div>
              )}

              {!isEdit && hasStructuredFlow && (
                <div className="space-y-3 rounded-lg border border-border p-3.5">
                  <div className="flex items-center gap-1.5">
                    <Layers className="size-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold text-foreground">Asset tag</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField label="Subsidiary" htmlFor="subsidiaryId" required>
                      <Controller
                        control={control}
                        name="subsidiaryId"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="subsidiaryId">
                              <SelectValue placeholder="Select subsidiary" />
                            </SelectTrigger>
                            <SelectContent>
                              {subsidiaries.data?.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FormField>

                    <FormField label="Branch" htmlFor="branchId" required>
                      <Controller
                        control={control}
                        name="branchId"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="branchId">
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.data?.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FormField>

                    <FormField label="Asset Type" htmlFor="categoryId" required error={errors.categoryId?.message} hint="Also determines the tag's type code.">
                      <Controller
                        control={control}
                        name="categoryId"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="categoryId">
                              <SelectValue placeholder="Select asset type" />
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

                    <FormField label="Purchase date" htmlFor="purchaseDate" required>
                      <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
                    </FormField>
                  </div>

                  <div className="space-y-2 border-t border-border pt-3">
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <Checkbox
                        checked={isDuplicate}
                        onCheckedChange={(c) => {
                          setIsDuplicate(!!c);
                          if (!c) setDuplicateParent(null);
                        }}
                      />
                      This is one of several identical items bought on the same invoice
                    </label>
                    {isDuplicate && (
                      <div className="space-y-1">
                        {watchedCategoryId ? (
                          <DuplicateAssetPicker categoryId={watchedCategoryId} value={duplicateParent} onSelect={handleSelectDuplicateParent} />
                        ) : (
                          <p className="text-xs text-muted-foreground">Select an asset type above first, then search for the existing item.</p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          Search for the item already registered for this purchase - this one will get the next letter added to its index (e.g. 001 becomes 001-A).
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {preview.data?.isAdvisory ? "Preview, confirmed when you save" : "Tag preview"}
                    </p>
                    <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 font-mono text-sm text-foreground">
                      {preview.isFetching
                        ? "Calculating..."
                        : preview.data?.previewTag ?? "Select subsidiary, branch, asset type, and date"}
                    </div>
                  </div>

                  {preview.data?.previewTag && <AssetTagBarcode value={preview.data.previewTag} />}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Name" htmlFor="name" required error={errors.name?.message} className="sm:col-span-2">
                  <Input id="name" placeholder="MacBook Pro 16&quot;" {...register("name")} />
                </FormField>

                {!(hasStructuredFlow && !isEdit) && (
                  <FormField label="Asset Type" htmlFor="categoryId" required error={errors.categoryId?.message}>
                    <Controller
                      control={control}
                      name="categoryId"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="categoryId">
                            <SelectValue placeholder="Select asset type" />
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
                )}

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

                <FormField
                  label="Custodian"
                  htmlFor="custodianId"
                  required={custodianLocked}
                  error={errors.custodianId?.message}
                  hint={custodianLocked ? "An asset in use keeps a custodian. Check it in to release them." : undefined}
                >
                  <Controller
                    control={control}
                    name="custodianId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="custodianId">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE} disabled={custodianLocked}>
                            Unassigned
                          </SelectItem>
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
                            <SelectItem
                              key={o.value}
                              value={o.value}
                              // Set by the system while a job is open, so it can be shown but not picked.
                              disabled={o.value === "maintenance" && field.value !== "maintenance"}
                            >
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
            </TabsContent>

            <TabsContent value="specs" className="space-y-4 p-4">
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
            </TabsContent>

            <TabsContent value="purchase" className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {!(hasStructuredFlow && !isEdit) && (
                  <FormField label="Purchase date" htmlFor="purchaseDate">
                    <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
                  </FormField>
                )}
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
            </TabsContent>

            <TabsContent value="photo" className="space-y-4 p-4">
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
            </TabsContent>
          </Tabs>
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
