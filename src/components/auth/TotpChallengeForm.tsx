import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TotpCodeInput } from "@/components/auth/TotpCodeInput";
import { ApiError } from "@/lib/http-error";

interface TotpChallengeFormProps {
  preAuthToken: string;
  completeChallenge: (preAuthToken: string, code: string) => Promise<void>;
  onComplete: () => void;
}

/** Shared between tenant and platform TOTP-challenge steps — see TotpEnrollForm for why. */
export function TotpChallengeForm({ preAuthToken, completeChallenge, onComplete }: TotpChallengeFormProps) {
  // Recovery codes (10 hex chars) don't fit the 6-slot boxed input, so this toggles between the
  // large segmented input for the common case and a plain text field for the fallback.
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const toggleMode = () => {
    setMode((m) => (m === "totp" ? "recovery" : "totp"));
    setCode("");
    setError(null);
  };

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
          {mode === "totp" ? "Open your authenticator app and enter the 6-digit code." : "Enter one of the recovery codes you saved at enrollment."}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "totp" ? (
          <div className="space-y-2">
            <Label htmlFor="challenge-code" className="block text-center">
              6-digit code
            </Label>
            <TotpCodeInput id="challenge-code" value={code} onChange={setCode} autoFocus />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="challenge-code">Recovery code</Label>
            <Input
              id="challenge-code"
              autoComplete="one-time-code"
              autoFocus
              maxLength={64}
              placeholder="e.g. 9e05baac37"
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              className="text-center font-mono text-base"
              required
            />
          </div>
        )}
        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading || code.length < 6}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Verify
        </Button>
      </form>
      <button type="button" onClick={toggleMode} className="block w-full text-center text-xs font-medium text-primary hover:underline">
        {mode === "totp" ? "Use a recovery code instead" : "Use your authenticator app instead"}
      </button>
    </div>
  );
}
