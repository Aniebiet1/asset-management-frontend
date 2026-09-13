import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Dices, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { useCreateOrgMutation } from "./api";
import { ApiError } from "@/lib/http-error";
import { toast } from "sonner";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let result = "";
  for (let i = 0; i < 14; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

/** The only place a workspace gets created — plan §0/§1. On success, shows the credentials
 * once so the platform admin can hand them off; the backend has no "email the new admin"
 * flow yet, only the invite path for *additional* staff. */
export function PlatformOrgCreatePage() {
  const navigate = useNavigate();
  const createOrg = useCreateOrgMutation();

  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState(generatePassword());
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ orgName: string; orgSlug: string; adminEmail: string; adminPassword: string } | null>(null);

  const handleNameChange = (v: string) => {
    setOrgName(v);
    if (!slugEdited) setOrgSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createOrg.mutateAsync({ orgName, orgSlug, adminName, adminEmail, adminPassword });
      setCreated({ orgName, orgSlug, adminEmail, adminPassword });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create that workspace.");
    }
  };

  const copyCredentials = () => {
    if (!created) return;
    const text = `Workspace: ${created.orgSlug}\nEmail: ${created.adminEmail}\nPassword: ${created.adminPassword}\nLogin: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text).then(() => toast.success("Credentials copied"));
  };

  if (created) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Workspace created</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Hand these credentials to {created.orgName}'s admin securely — they won't be shown again.
              </p>
            </div>
            <div className="w-full space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-left font-mono text-xs">
              <p>
                <span className="text-muted-foreground">Workspace:</span> {created.orgSlug}
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span> {created.adminEmail}
              </p>
              <p>
                <span className="text-muted-foreground">Password:</span> {created.adminPassword}
              </p>
              <p>
                <span className="text-muted-foreground">Login:</span> {window.location.origin}/login
              </p>
            </div>
            <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={copyCredentials}>
              <Copy className="size-3.5" />
              Copy all
            </Button>
            <Button className="w-full" onClick={() => navigate("/platform/orgs")}>
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <Button variant="ghost" size="sm" className="mb-3 gap-1.5 text-xs" asChild>
        <Link to="/platform/orgs">
          <ArrowLeft className="size-3.5" />
          Back to Organizations
        </Link>
      </Button>
      <PageHeader title="New workspace" description="Creates the organization and its first admin account in one step." />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Organization name</Label>
              <Input id="orgName" value={orgName} onChange={(e) => handleNameChange(e.target.value)} placeholder="Acme Logistics" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orgSlug">Workspace slug</Label>
              <Input
                id="orgSlug"
                value={orgSlug}
                onChange={(e) => {
                  setOrgSlug(slugify(e.target.value));
                  setSlugEdited(true);
                }}
                placeholder="acme-logistics"
                required
              />
              <p className="text-[11px] text-muted-foreground">Used at login as the organization identifier.</p>
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">First admin account</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="adminName">Name</Label>
                  <Input id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Ada Admin" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adminEmail">Email</Label>
                  <Input id="adminEmail" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="ada@acme.com" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adminPassword">Initial password</Label>
                  <div className="flex gap-2">
                    <Input id="adminPassword" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} minLength={8} required className="font-mono text-xs" />
                    <Button type="button" variant="outline" size="icon" title="Generate a new password" onClick={() => setAdminPassword(generatePassword())}>
                      <Dices className="size-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">You'll see this once more on the next screen to copy — it isn't emailed automatically yet.</p>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={createOrg.isPending}>
              {createOrg.isPending ? "Creating…" : "Create workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
