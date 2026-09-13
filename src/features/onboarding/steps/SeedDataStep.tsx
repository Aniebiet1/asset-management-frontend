import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/http-error";

/** Optional, skippable — plan §H step 5. Only creates a row for a section the admin actually
 * filled in; nothing required. */
export function SeedDataStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [locationName, setLocationName] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const calls: Promise<unknown>[] = [];
      if (locationName.trim() && locationCode.trim()) {
        calls.push(apiFetch("/locations", { method: "POST", body: JSON.stringify({ name: locationName.trim(), code: locationCode.trim() }) }));
      }
      if (categoryName.trim() && categoryCode.trim()) {
        calls.push(apiFetch("/categories", { method: "POST", body: JSON.stringify({ name: categoryName.trim(), code: categoryCode.trim() }) }));
      }
      if (departmentName.trim() && departmentCode.trim()) {
        calls.push(apiFetch("/departments", { method: "POST", body: JSON.stringify({ name: departmentName.trim(), code: departmentCode.trim() }) }));
      }
      await Promise.all(calls);
      onNext();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that. You can add it later from Settings.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Add your first location, category and department</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional — skip this and add them later from Settings if you'd rather set them up as a team.
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-foreground">Location</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input placeholder="Lagos HQ" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Code</Label>
            <Input placeholder="LG-HQ" value={locationCode} onChange={(e) => setLocationCode(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-foreground">Category</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input placeholder="Laptops" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Code</Label>
            <Input placeholder="LAP" value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-foreground">Department</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input placeholder="Operations" value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Code</Label>
            <Input placeholder="OPS" value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button type="button" onClick={handleContinue} className="flex-1" disabled={isLoading}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Continue
        </Button>
      </div>
    </div>
  );
}
