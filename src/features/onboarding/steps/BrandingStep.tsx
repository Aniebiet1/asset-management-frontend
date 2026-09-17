import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandingForm } from "@/features/settings/components/BrandingForm";
import type { Organization } from "@/types";

export function BrandingStep({ org, onNext, onBack }: { org: Organization; onNext: () => void; onBack: () => void }) {
  return (
    <BrandingForm
      org={org}
      onSaved={onNext}
      renderActions={({ isSaving }) => (
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={isSaving}>
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            Continue
          </Button>
        </div>
      )}
    />
  );
}
