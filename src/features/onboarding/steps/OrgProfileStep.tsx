import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrgProfileForm } from "@/features/settings/components/OrgProfileForm";
import type { Organization } from "@/types";

export function OrgProfileStep({ org, onNext }: { org: Organization; onNext: () => void }) {
  return (
    <OrgProfileForm
      org={org}
      onSaved={onNext}
      renderActions={({ isSaving }) => (
        <Button type="submit" className="w-full" disabled={isSaving}>
          {isSaving && <Loader2 className="size-4 animate-spin" />}
          Continue
        </Button>
      )}
    />
  );
}
