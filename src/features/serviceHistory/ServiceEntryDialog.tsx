import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/ui/form";
import { SegmentedControl } from "@/components/common/DashboardCard";
import { ApiError } from "@/lib/http-error";
import { useAuthStore } from "@/store/auth.store";
import { useVendorsQuery } from "@/features/catalog/api";
import { useCreateServiceEntryMutation, useUpdateServiceEntryMutation } from "./api";
import { SERVICE_TYPE_OPTIONS, serviceTypeOf } from "./serviceTypes";
import type { ServiceHistoryEntry } from "@/types";

const NONE = "__none__";

const schema = z.object({
  date: z
    .string()
    .min(1, "Date is required")
    .refine((v) => v <= todayInputValue(), "Date can't be in the future"),
  type: z.enum(["repair", "service", "inspection"]),
  title: z.string().trim().min(1, "Say what was done").max(255),
  cost: z
    .string()
    .trim()
    .refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), "Enter a valid amount"),
  comment: z.string().trim().max(2000).optional(),
  vendorId: z.string(),
  technicianName: z.string().trim().max(150).optional(),
});

type FormValues = z.infer<typeof schema>;

function todayInputValue(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function valuesFor(entry: ServiceHistoryEntry | null): FormValues {
  if (!entry) {
    return { date: todayInputValue(), type: "repair", title: "", cost: "", comment: "", vendorId: NONE, technicianName: "" };
  }
  return {
    date: (entry.completedDate ?? entry.scheduledDate).slice(0, 10),
    type: serviceTypeOf(entry.maintenanceType),
    title: entry.title,
    cost: entry.cost == null ? "" : String(Number(entry.cost)),
    comment: entry.notes ?? "",
    vendorId: entry.vendorId ?? NONE,
    technicianName: entry.technicianName ?? "",
  };
}

/** Log a new entry, or edit one when `entry` is passed. */
export function ServiceEntryDialog({
  assetId,
  entry,
  open,
  onOpenChange,
}: {
  assetId: string;
  entry: ServiceHistoryEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const org = useAuthStore((s) => s.org);
  const vendors = useVendorsQuery();
  const createEntry = useCreateServiceEntryMutation(assetId);
  const updateEntry = useUpdateServiceEntryMutation(assetId);
  const [formError, setFormError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const isEdit = !!entry;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFor(entry) });

  useEffect(() => {
    if (open) {
      reset(valuesFor(entry));
      setFormError(null);
      setShowMore(!!entry && (!!entry.vendorId || !!entry.technicianName));
    }
  }, [open, entry, reset]);

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    const input = {
      date: values.date,
      type: values.type,
      title: values.title,
      cost: values.cost === "" ? 0 : Number(values.cost),
      comment: values.comment ?? "",
      vendorId: values.vendorId === NONE ? null : values.vendorId,
      technicianName: values.technicianName ?? "",
    };
    try {
      if (entry) {
        await updateEntry.mutateAsync({ entryId: entry.id, input });
        toast.success("Entry updated");
      } else {
        await createEntry.mutateAsync(input);
        toast.success("Service logged");
      }
      onOpenChange(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't save this entry. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit entry" : "Log a repair or service"}</DialogTitle>
          <DialogDescription>{isEdit ? "Correct the details of this entry." : "Record work that was done on this asset."}</DialogDescription>
        </DialogHeader>

        {/* noValidate: the date input's `max` greys out future days in the picker, but the error
            itself should come from zod inline, not the browser's native bubble. */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <SegmentedControl ariaLabel="Type of work" options={[...SERVICE_TYPE_OPTIONS]} value={field.value} onChange={field.onChange} />
            )}
          />

          <FormField label="What was done" htmlFor="title" required error={errors.title?.message}>
            <Input id="title" placeholder="Replaced the compressor" autoComplete="off" {...register("title")} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date" htmlFor="date" required error={errors.date?.message}>
              <Input id="date" type="date" max={todayInputValue()} {...register("date")} />
            </FormField>
            <FormField label={`Cost (${org?.currency ?? "NGN"})`} htmlFor="cost" error={errors.cost?.message}>
              <Input id="cost" type="number" inputMode="decimal" min={0} step="any" placeholder="0" className="tabular-nums" {...register("cost")} />
            </FormField>
          </div>

          <FormField label="Comment" htmlFor="comment" error={errors.comment?.message}>
            <Textarea id="comment" rows={3} placeholder="What was wrong, what the technician said, anything to watch for" {...register("comment")} />
          </FormField>

          <div>
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={showMore}
            >
              <ChevronDown className={cn("size-3.5 transition-transform", showMore && "rotate-180")} />
              Who did the work
            </button>
            {showMore && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Vendor" htmlFor="vendorId">
                  <Controller
                    control={control}
                    name="vendorId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
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
                    )}
                  />
                </FormField>
                <FormField label="Technician" htmlFor="technicianName">
                  <Input id="technicianName" placeholder="Name" {...register("technicianName")} />
                </FormField>
              </div>
            )}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              {isEdit ? "Save changes" : "Log entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
