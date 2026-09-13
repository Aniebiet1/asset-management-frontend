import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { usePlatformAuthStore } from "@/store/platformAuth.store";
import { ApiError } from "@/lib/http-error";

export function PlatformLoginPage() {
  const navigate = useNavigate();
  const login = usePlatformAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.status === "totp_enrollment_required") {
        navigate("/platform/totp/enroll", { state: { enrollmentToken: result.enrollmentToken } });
      } else {
        navigate("/platform/totp/challenge", { state: { preAuthToken: result.preAuthToken } });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout footer="Tecres internal — not for customer use.">
      <div className="mb-5 flex flex-col items-center text-center">
        <div className="mb-2 flex size-9 items-center justify-center rounded-full bg-muted">
          <ShieldCheck className="size-4 text-foreground" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Tecres platform admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in with your Tecres staff account.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@tecres.internal" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
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
    </AuthLayout>
  );
}
