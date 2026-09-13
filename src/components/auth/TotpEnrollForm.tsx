import { useEffect, useRef, useState } from "react";
import { Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TotpCodeInput } from "@/components/auth/TotpCodeInput";
import { ApiError } from "@/lib/http-error";
import { toast } from "sonner";

interface EnrollmentStart {
  otpAuthUrl: string;
  qrCodeDataUrl: string;
  manualEntryKey: string;
}

interface TotpEnrollFormProps {
  enrollmentToken: string;
  startEnrollment: (token: string) => Promise<EnrollmentStart>;
  verifyEnrollment: (token: string, code: string) => Promise<{ recoveryCodes: string[] }>;
  onComplete: () => void;
}

/**
 * Shared between the tenant (`/totp/enroll`) and Tecres platform-admin (`/platform/totp/enroll`)
 * flows — mandatory TOTP enrollment is identical in shape for both, just against different stores/
 * endpoints (injected via props so this component has no auth-store dependency of its own).
 */
export function TotpEnrollForm({ enrollmentToken, startEnrollment, verifyEnrollment, onComplete }: TotpEnrollFormProps) {
  const [enrollment, setEnrollment] = useState<EnrollmentStart | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [confirmedSaved, setConfirmedSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  // `/auth/totp/enroll` is rate-limited (5/15min) and mints a fresh secret server-side on every
  // call — React 18 StrictMode's dev-only double-invoke of this effect would otherwise fire it
  // twice per mount. Share one in-flight promise across both invocations so exactly one request
  // goes out; each invocation still gets its own `cancelled` guard for the (unrelated) real-unmount case.
  const inFlightRef = useRef<Promise<EnrollmentStart> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!inFlightRef.current) inFlightRef.current = startEnrollment(enrollmentToken);
    inFlightRef.current
      .then((result) => {
        if (!cancelled) setEnrollment(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not start enrollment. Please log in again.");
      })
      .finally(() => {
        if (!cancelled) setIsStarting(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentToken]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { recoveryCodes } = await verifyEnrollment(enrollmentToken, code);
      setRecoveryCodes(recoveryCodes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    if (!recoveryCodes) return;
    navigator.clipboard.writeText(recoveryCodes.join("\n")).then(() => toast.success("Recovery codes copied"));
  };

  if (recoveryCodes) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Save your recovery codes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use one of these if you ever lose access to your authenticator app. Each code works once.
            They won't be shown again.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm">
          {recoveryCodes.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={copyRecoveryCodes}>
          <Copy className="size-3.5" />
          Copy all
        </Button>
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <Checkbox checked={confirmedSaved} onCheckedChange={(v) => setConfirmedSaved(v === true)} className="mt-0.5" />
          I've saved these recovery codes somewhere safe.
        </label>
        <Button className="w-full" disabled={!confirmedSaved} onClick={onComplete}>
          Continue
        </Button>
      </div>
    );
  }

  if (isStarting) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!enrollment) {
    return <p className="text-sm text-destructive">{error ?? "Could not start enrollment."}</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Set up two-factor authentication</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Required before you can continue. Scan this with Google Authenticator, 1Password, or any TOTP app.
        </p>
      </div>
      <div className="flex justify-center">
        <img src={enrollment.qrCodeDataUrl} alt="TOTP QR code" className="size-40 rounded-lg border border-border" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Can't scan? Enter this key manually</Label>
        <Input readOnly value={enrollment.manualEntryKey} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
      </div>
      <form onSubmit={handleVerify} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="totp-code" className="block text-center">
            6-digit code
          </Label>
          <TotpCodeInput id="totp-code" value={code} onChange={setCode} />
        </div>
        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading || code.length !== 6}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Verify and continue
        </Button>
      </form>
    </div>
  );
}
