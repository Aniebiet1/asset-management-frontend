import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/http-error";

interface TotpChallengeFormProps {
  preAuthToken: string;
  completeChallenge: (preAuthToken: string, code: string) => Promise<void>;
  onComplete: () => void;
}

/** Shared between tenant and platform TOTP-challenge steps — see TotpEnrollForm for why. */
export function TotpChallengeForm({ preAuthToken, completeChallenge, onComplete }: TotpChallengeFormProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await completeChallenge(preAuthToken, code);
      onComplete();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Enter your authentication code</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Open your authenticator app, or enter a recovery code if you don't have access to it.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="challenge-code">Code</Label>
          <Input
            id="challenge-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={64}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.trim())}
            className="text-center text-lg tracking-[0.5em]"
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading || code.length < 6}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Verify
        </Button>
      </form>
    </div>
  );
}
