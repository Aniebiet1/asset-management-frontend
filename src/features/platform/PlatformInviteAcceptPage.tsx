import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/common/PasswordInput";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { BrandedLoader } from "@/components/brand/BrandedLoader";
import { ApiError } from "@/lib/http-error";
import { usePlatformAuthStore } from "@/store/platformAuth.store";
import { useTecresBrandTheme } from "./useTecresBrandTheme";
import { platformHero, PLATFORM_AUTH_FOOTER } from "./platformHero";

/**
 * Public accept page for a Tecres platform-console invite, kept separate from the tenant staff
 * invite at `/invite/:token/accept` — different identity space, different token, different
 * follow-on flow. Setting a password here does not sign anyone in: it hands back an enrollment
 * token and pushes straight into TOTP enrollment, so no platform account exists without an
 * authenticator.
 */
export function PlatformInviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const fetchInvite = usePlatformAuthStore((s) => s.fetchInvite);
  const acceptInvite = usePlatformAuthStore((s) => s.acceptInvite);
  useTecresBrandTheme();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const invite = useQuery({
    queryKey: ["platform", "invite", token],
    queryFn: () => fetchInvite(token as string),
    enabled: !!token,
    retry: false,
  });

  if (!token || invite.isError) {
    return (
      <AuthLayout hero={platformHero} footer={PLATFORM_AUTH_FOOTER}>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground">This invitation isn't valid</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The link may have expired or already been used. Ask a Platform Owner to send a new one.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="mt-4 w-full">
          <Link to="/platform/login">Back to sign in</Link>
        </Button>
      </AuthLayout>
    );
  }

  if (invite.isLoading || !invite.data) {
    return (
      <AuthLayout hero={platformHero} footer={PLATFORM_AUTH_FOOTER}>
        <div className="flex justify-center py-8">
          <BrandedLoader />
        </div>
      </AuthLayout>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const { enrollmentToken } = await acceptInvite(token as string, password);
      navigate("/platform/totp/enroll", { replace: true, state: { enrollmentToken } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't finish setting up your account.");
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout hero={platformHero} footer={PLATFORM_AUTH_FOOTER}>
      <div className="mb-5 text-center">
        <h1 className="text-lg font-semibold text-foreground">Set up your platform account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome, {invite.data.name}. You're joining the Tecres platform console as {invite.data.roleLabel}.
        </p>
      </div>

      <div className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Signing in as <span className="font-medium text-foreground">{invite.data.email}</span>. After choosing a
        password you'll set up an authenticator app, which is required for every platform account.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Continue to two-factor setup
        </Button>
      </form>
    </AuthLayout>
  );
}
