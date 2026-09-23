import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form";
import { ApiError } from "@/lib/http-error";
import { useCategoriesQuery, useSubsidiariesQuery, useBranchesQuery } from "@/features/catalog/api";
import { useUpdateAssetIdentityMutation } from "@/features/assets/api";
import type { Asset } from "@/types";

/**
 * Admin-only correction path for an already-locked structured tag (subsidiary/branch/type/
 * purchase date) - a normal edit can't touch these once an asset has a structured tag (see
 * assets.service.ts updateAsset on the backend), this is the only door back in. Regenerates the
 * tag and requires a reason, which the backend writes to the activity log as an audit trail.
 */
export function CorrectTagDialog({
  asset,
  open,
  onOpenChange,
}: {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const subsidiaries = useSubsidiariesQuery();
  const categories = useCategoriesQuery();
  const updateIdentity = useUpdateAssetIdentityMutation(asset.id);

  const [subsidiaryId, setSubsidiaryId] = useState(asset.subsidiaryId ?? "");
  const [branchId, setBranchId] = useState(asset.branchId ?? "");
  const [categoryId, setCategoryId] = useState(asset.categoryId);
  const [purchaseDate, setPurchaseDate] = useState(asset.purchaseDate ? asset.purchaseDate.slice(0, 10) : "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const branches = useBranchesQuery(subsidiaryId);

  useEffect(() => {
    if (!open) return;
    setSubsidiaryId(asset.subsidiaryId ?? "");
    setBranchId(asset.branchId ?? "");
    setCategoryId(asset.categoryId);
    setPurchaseDate(asset.purchaseDate ? asset.purchaseDate.slice(0, 10) : "");
    setReason("");
    setError(null);
  }, [open, asset]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (reason.trim().length < 5) {
      setError("Please describe why this correction is needed (at least 5 characters).");
      return;
    }
    try {
      const updated = await updateIdentity.mutateAsync({ subsidiaryId, branchId, categoryId, purchaseDate, reason: reason.trim() });
      toast.success(`Tag corrected to ${updated.assetTag}`);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't correct this tag. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Correct tag details</DialogTitle>
          <DialogDescription>
            This regenerates the asset's tag and is logged with your reason. Use it only to fix a mistake made when the
            asset was created.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Subsidiary" htmlFor="correct-subsidiaryId" required>
              <Select
                value={subsidiaryId}
                onValueChange={(v) => {
                  setSubsidiaryId(v);
                  setBranchId("");
                }}
              >
                <SelectTrigger id="correct-subsidiaryId">
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
            </FormField>

            <FormField label="Branch" htmlFor="correct-branchId" required>
              <Select value={branchId} onValueChange={setBranchId} disabled={!subsidiaryId}>
                <SelectTrigger id="correct-branchId">
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
            </FormField>

            <FormField label="Asset type" htmlFor="correct-categoryId" required>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="correct-categoryId">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {categories.data?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Purchase date" htmlFor="correct-purchaseDate" required>
              <Input id="correct-purchaseDate" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </FormField>

            <FormField label="Reason" htmlFor="correct-reason" required className="sm:col-span-2" hint="Recorded in the activity log.">
              <Textarea id="correct-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong branch was selected at creation" />
            </FormField>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateIdentity.isPending}>
              Correct tag
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
