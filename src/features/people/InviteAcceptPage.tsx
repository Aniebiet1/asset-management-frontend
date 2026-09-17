import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ApiError } from "@/lib/http-error";
import { useAcceptInviteMutation } from "@/features/people/api";

/**
 * Public "accept staff invite" page, distinct from the first-admin onboarding wizard: this is
 * for additional staff invited by an org admin via POST /people/invite. No auth required, the
 * token in the URL is the only credential until the account is created here.
 */
export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const acceptInvite = useAcceptInviteMutation();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <AuthLayout>
        <p className="text-center text-sm text-destructive">This invitation link is missing its token.</p>
        <Button variant="outline" size="sm" asChild className="mt-4 w-full">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </AuthLayout>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    try {
      await acceptInvite.mutateAsync({ token: token as string, name: name.trim(), password });
      toast.success("Account created. Sign in to get started.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "This invitation link is invalid or has expired.");
    }
  }

  return (
    <AuthLayout>
      <div className="mb-5 text-center">
        <h1 className="text-lg font-semibold text-foreground">Accept your invitation</h1>
        <p className="mt-1 text-sm text-muted-foreground">Set your name and password to join your organization.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={acceptInvite.isPending}>
          {acceptInvite.isPending && <Loader2 className="size-4 animate-spin" />}
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
