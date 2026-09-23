import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form";
import { useCategoriesQuery, useDepartmentsQuery, useLocationsQuery } from "@/features/catalog/api";
import { useCreateAuditMutation } from "@/features/audits/api";
import { ApiError } from "@/lib/http-error";
import type { AuditScopeType } from "@/types";

const scopeOptions: { value: AuditScopeType; label: string }[] = [
  { value: "all", label: "All assets" },
  { value: "location", label: "By location" },
  { value: "department", label: "By department" },
  { value: "category", label: "By asset type" },
];

const createAuditSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(255),
    scopeType: z.enum(["all", "location", "department", "category"]),
    scopeId: z.string().optional(),
    notes: z.string().trim().optional(),
  })
  .refine((data) => data.scopeType === "all" || !!data.scopeId, {
    message: "Select a target for this scope",
    path: ["scopeId"],
  });

type CreateAuditValues = z.infer<typeof createAuditSchema>;

const defaultValues: CreateAuditValues = { name: "", scopeType: "all", scopeId: "", notes: "" };

/** Assigner-only "create audit + scope" step (plan §D / BUILD_PLAN.md Phase 6). Creates the audit
 * in `draft` status with its scope pre-computed server-side; assigning a person to it is a
 * separate step done from the detail page once the audit exists. */
export function CreateAuditDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const locations = useLocationsQuery();
  const departments = useDepartmentsQuery();
  const categories = useCategoriesQuery();
  const createAudit = useCreateAuditMutation();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateAuditValues>({
    resolver: zodResolver(createAuditSchema),
    defaultValues,
  });

  const scopeType = watch("scopeType");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      reset(defaultValues);
      setFormError(null);
    }
  }

  const onSubmit = async (values: CreateAuditValues) => {
    setFormError(null);
    try {
      const created = await createAudit.mutateAsync({
        name: values.name,
        scopeType: values.scopeType,
        scopeId: values.scopeType === "all" ? undefined : values.scopeId,
        notes: values.notes || undefined,
      });
      toast.success("Audit created");
      setOpen(false);
      reset(defaultValues);
      navigate(`/audits/${created.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't create this audit. Please try again.");
    }
  };

  const scopeTargets =
    scopeType === "location" ? locations.data : scopeType === "department" ? departments.data : scopeType === "category" ? categories.data : undefined;
  const scopeLabel = scopeType === "location" ? "Location" : scopeType === "department" ? "Department" : "Asset Type";

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        New Audit
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create audit</DialogTitle>
          <DialogDescription>
            Pick which assets this audit covers. Every asset in scope is added as a pending item for the assignee to scan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Audit name" htmlFor="audit-name" required error={errors.name?.message}>
            <Input id="audit-name" placeholder="Q1 2026 Lagos HQ Count" {...register("name")} />
          </FormField>

          <FormField label="Scope" htmlFor="audit-scope-type">
            <Controller
              control={control}
              name="scopeType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="audit-scope-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {scopeType !== "all" && (
            <FormField label={scopeLabel} htmlFor="audit-scope-id" required error={errors.scopeId?.message}>
              <Controller
                control={control}
                name="scopeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="audit-scope-id">
                      <SelectValue placeholder={`Select ${scopeLabel.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeTargets?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}

          <FormField label="Notes" htmlFor="audit-notes" hint="Optional context for the assignee.">
            <Textarea id="audit-notes" {...register("notes")} />
          </FormField>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              Create audit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}
