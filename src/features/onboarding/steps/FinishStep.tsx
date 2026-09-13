import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/http-error";
import type { Organization } from "@/types";

export function FinishStep({ org, onBack, onFinish }: { org: Organization; onBack: () => void; onFinish: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFinish = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await onFinish();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't finish setup. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="size-6 text-emerald-500" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">You're all set, {org.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your workspace is configured. You can change any of this later from Settings.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex w-full gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1" disabled={isLoading}>
          Back
        </Button>
        <Button type="button" onClick={handleFinish} className="flex-1" disabled={isLoading}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
