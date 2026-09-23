import { useState } from "react";
import type { ReactNode } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/ui/form";
import { ApiError } from "@/lib/http-error";
import { Skeleton } from "@/components/ui/skeleton";

type FieldType = "text" | "textarea" | "number" | "decimal" | "switch" | "select";

export interface CatalogFieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  /** Spans both grid columns in the dialog form instead of sharing a row with the next field.
   * Textareas and switches always span full width regardless of this flag. */
  fullWidth?: boolean;
  /** type: "select" only - the dropdown's options. */
  options?: { value: string; label: string }[];
  /** Disables the field in the dialog form (create AND edit) when this returns true for the item
   * being edited (null while creating) - e.g. a branch's code once it's locked. */
  disabledWhen?: (item: unknown) => boolean;
}

function isFullWidthField(field: CatalogFieldConfig): boolean {
  return field.type === "textarea" || field.type === "switch" || Boolean(field.fullWidth);
}

type FormValue = string | number | boolean;

interface CatalogItem {
  id: string;
  name: string;
  code: string;
}

function fieldValue(item: unknown, name: string): unknown {
  return (item as Record<string, unknown>)[name];
}

/**
 * Shared CRUD list + dialog for the three catalog resources that are genuinely identical in
 * shape (categories/locations/departments: name + code + a handful of optional fields, simple
 * validation, no cross-resource logic) - only vendors deviates enough in ownership (Phase 7 builds
 * its write UI) to stay out of this. Field-level config keeps each resource's actual differences
 * (which fields, which are required) external to this component instead of triplicating the
 * dialog/list chrome three times.
 */
export function CatalogManager<T extends CatalogItem>({
  resourceLabel,
  description,
  showHeading = true,
  items,
  isLoading,
  fields,
  renderSubtitle,
  canManage,
  onCreate,
  onUpdate,
  onDelete,
}: {
  resourceLabel: string;
  description?: string;
  /** Set false when the page's own title already names this resource, so it isn't repeated. */
  showHeading?: boolean;
  items: T[] | undefined;
  isLoading: boolean;
  fields: CatalogFieldConfig[];
  renderSubtitle?: (item: T) => ReactNode;
  canManage: boolean;
  onCreate: (input: Record<string, unknown>) => Promise<unknown>;
  onUpdate: (id: string, input: Record<string, unknown>) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [formState, setFormState] = useState<Record<string, FormValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function initialValue(field: CatalogFieldConfig, item: T | null): FormValue {
    if (field.type === "switch") return item ? Boolean(fieldValue(item, field.name)) : true;
    if (item) return (fieldValue(item, field.name) as FormValue) ?? "";
    return "";
  }

  function openCreate() {
    const initial: Record<string, FormValue> = {};
    fields.forEach((f) => {
      initial[f.name] = initialValue(f, null);
    });
    setFormState(initial);
    setEditing(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(item: T) {
    const initial: Record<string, FormValue> = {};
    fields.forEach((f) => {
      initial[f.name] = initialValue(f, item);
    });
    setFormState(initial);
    setEditing(item);
    setError(null);
    setDialogOpen(true);
  }

  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = formState[f.name];
      if (f.type === "switch") {
        payload[f.name] = Boolean(raw);
        continue;
      }
      if (f.type === "number") {
        payload[f.name] = raw === "" || raw === undefined ? undefined : Number(raw);
        continue;
      }
      // "decimal" fields (e.g. depreciationRate) are numeric-looking but the backend schema
      // wants them as a string (it's a Postgres `numeric` column, serialized as text) - only
      // "number" fields convert to a JS number.
      const str = typeof raw === "string" ? raw.trim() : "";
      payload[f.name] = str === "" ? undefined : str;
    }
    return payload;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const payload = buildPayload();
      if (editing) {
        await onUpdate(editing.id, payload);
        toast.success(`${resourceLabel} updated`);
      } else {
        await onCreate(payload);
        toast.success(`${resourceLabel} created`);
      }
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Couldn't save this ${resourceLabel.toLowerCase()}. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      toast.success(`${resourceLabel} deleted`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Couldn't delete this ${resourceLabel.toLowerCase()}.`);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          {showHeading && <h2 className="text-base font-semibold text-foreground">{resourceLabel} list</h2>}
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {canManage && (
          <Button type="button" size="sm" className="shrink-0 gap-1.5" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add {resourceLabel.toLowerCase()}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : items && items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{item.name}</p>
                    <Badge variant="outline" className="font-mono">
                      {item.code}
                    </Badge>
                  </div>
                  {renderSubtitle && <div className="mt-0.5 text-xs text-muted-foreground">{renderSubtitle(item)}</div>}
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => openEdit(item)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(item)}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No {resourceLabel.toLowerCase()}s yet.
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${resourceLabel.toLowerCase()}` : `Add ${resourceLabel.toLowerCase()}`}
            </DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
              {fields.map((f) => {
                const disabled = f.disabledWhen ? f.disabledWhen(editing) : false;
                return (
                  <FormField
                    key={f.name}
                    label={f.label}
                    htmlFor={f.name}
                    required={f.required}
                    hint={disabled ? "Locked - already in use, can't be changed." : f.hint}
                    className={cn(isFullWidthField(f) && "sm:col-span-2")}
                  >
                    {f.type === "textarea" ? (
                      <Textarea
                        id={f.name}
                        value={(formState[f.name] as string) ?? ""}
                        placeholder={f.placeholder}
                        disabled={disabled}
                        onChange={(e) => setFormState((s) => ({ ...s, [f.name]: e.target.value }))}
                      />
                    ) : f.type === "switch" ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          id={f.name}
                          checked={Boolean(formState[f.name])}
                          disabled={disabled}
                          onCheckedChange={(checked) => setFormState((s) => ({ ...s, [f.name]: checked }))}
                        />
                      </div>
                    ) : f.type === "select" ? (
                      <Select
                        value={(formState[f.name] as string) ?? ""}
                        disabled={disabled}
                        onValueChange={(value) => setFormState((s) => ({ ...s, [f.name]: value }))}
                      >
                        <SelectTrigger id={f.name}>
                          <SelectValue placeholder={f.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {f.options?.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={f.name}
                        type={f.type === "number" || f.type === "decimal" ? "number" : "text"}
                        step={f.type === "decimal" ? "0.01" : undefined}
                        value={(formState[f.name] as string | number) ?? ""}
                        placeholder={f.placeholder}
                        required={f.required}
                        disabled={disabled}
                        onChange={(e) => setFormState((s) => ({ ...s, [f.name]: e.target.value }))}
                      />
                    )}
                  </FormField>
                );
              })}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-1.5">
                {isSaving && <Loader2 className="size-3.5 animate-spin" />}
                {editing ? "Save changes" : `Add ${resourceLabel.toLowerCase()}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              This can't be undone. Assets currently referencing this {resourceLabel.toLowerCase()} may be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={isDeleting} className="gap-1.5" onClick={handleDelete}>
              {isDeleting && <Loader2 className="size-3.5 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
