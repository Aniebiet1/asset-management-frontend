import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useAuthStore } from "@/store/auth.store";
import { ApiError } from "@/lib/http-error";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [orgSlug, setOrgSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await login(orgSlug.trim().toLowerCase(), email.trim(), password);
      if (result.status === "totp_enrollment_required") {
        navigate("/totp/enroll", { state: { enrollmentToken: result.enrollmentToken } });
      } else {
        navigate("/totp/challenge", { state: { preAuthToken: result.preAuthToken } });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout footer="New workspaces are set up by Tecres. Contact your account team if you need one.">
      <div className="mb-5 text-center">
        <h1 className="text-lg font-semibold text-foreground">Sign in to your workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your organization, email and password to continue.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="orgSlug">Organization</Label>
          <Input id="orgSlug" placeholder="acme" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} autoComplete="organization" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Forgot your password?{" "}
        <span className="cursor-pointer font-medium text-primary hover:underline" onClick={() => navigate("/forgot-password")}>
          Reset it
        </span>
      </p>
    </AuthLayout>
  );
}
