import { useState } from "react";
import { Loader2, MailPlus, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDateTime, getInitials } from "@/lib/format";
import { roleLabelMap } from "@/lib/status";
import { ApiError } from "@/lib/http-error";
import { usePlatformAuthStore } from "@/store/platformAuth.store";
import type { PlatformAdmin, PlatformAdminRole } from "@/types";
import { usePlatformAdminsQuery, useInvitePlatformAdminMutation, useUpdatePlatformAdminRoleMutation } from "./api";

const ROLE_OPTIONS: { value: PlatformAdminRole; label: string; description: string }[] = [
  {
    value: "platform_owner",
    label: "Platform Owner",
    description: "Full access: suspend workspaces, adjust quotas, force password resets, and invite other admins.",
  },
  {
    value: "platform_support",
    label: "Platform Support",
    description: "Read-only across the fleet, plus resolving alerts. Cannot change a workspace or invite admins.",
  },
];

function RolePill({ role }: { role: PlatformAdminRole }) {
  const isOwner = role === "platform_owner";
  return (
    <span
      className={
        isOwner
          ? "inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
          : "inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
      }
    >
      {isOwner ? <ShieldCheck className="size-3" /> : <ShieldOff className="size-3" />}
      {roleLabelMap[role] ?? role}
    </span>
  );
}

/**
 * Tecres's own admin roster, gated to `platform_owner` by both this page and the backend's
 * `canManagePlatformAdmins`. Nothing here touches tenant identities: platform admins live in
 * their own table with their own JWT secret (see the frontend CLAUDE.md).
 */
export function PlatformAdminsPage() {
  const currentAdmin = usePlatformAuthStore((s) => s.admin);
  const isOwner = currentAdmin?.role === "platform_owner";

  const { data, isLoading } = usePlatformAdminsQuery(isOwner);
  const invite = useInvitePlatformAdminMutation();
  const updateRole = useUpdatePlatformAdminRoleMutation();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PlatformAdminRole>("platform_owner");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [roleTarget, setRoleTarget] = useState<{ admin: PlatformAdmin; role: PlatformAdminRole } | null>(null);

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm font-medium text-foreground">Platform Owner access required</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Only a Platform Owner can view or change the Tecres admin roster.
          </p>
        </CardContent>
      </Card>
    );
  }

  const resetInviteForm = () => {
    setName("");
    setEmail("");
    setRole("platform_owner");
    setInviteError(null);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    if (!name.trim()) {
      setInviteError("Please enter their name.");
      return;
    }
    try {
      await invite.mutateAsync({ name: name.trim(), email: email.trim(), role });
      toast.success(`Invitation sent to ${email.trim()}`);
      setInviteOpen(false);
      resetInviteForm();
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : "Couldn't send that invitation.");
    }
  };

  const handleRoleChange = async () => {
    if (!roleTarget) return;
    try {
      await updateRole.mutateAsync({ adminId: roleTarget.admin.id, role: roleTarget.role });
      toast.success(`${roleTarget.admin.name} is now ${roleLabelMap[roleTarget.role]}`);
      setRoleTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't change that role.");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Platform admins</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Who at Tecres can access this console. Invitees set their own password and enroll an authenticator before
            they get a session.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}>
          <MailPlus className="size-3.5" />
          Invite admin
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Admins</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="space-y-2 px-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Two-factor</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Change role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.admins.map((admin) => {
                  const isSelf = admin.id === currentAdmin?.id;
                  return (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                            {getInitials(admin.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">
                              {admin.name}
                              {isSelf && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">{admin.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RolePill role={admin.role} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {admin.totpEnabled ? "Enrolled" : "Not enrolled"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {admin.createdAt ? formatDate(admin.createdAt) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {isSelf ? (
                          <span className="text-xs text-muted-foreground">Not available</span>
                        ) : (
                          <Select
                            value={admin.role}
                            onValueChange={(value) => setRoleTarget({ admin, role: value as PlatformAdminRole })}
                          >
                            <SelectTrigger size="sm" className="ml-auto w-[170px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!data?.admins.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No platform admins yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pending invitations</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="px-6">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : data?.invites.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invitee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited by</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invites.map((pending) => (
                  <TableRow key={pending.id}>
                    <TableCell>
                      <div className="text-sm font-medium text-foreground">{pending.name}</div>
                      <div className="text-xs text-muted-foreground">{pending.email}</div>
                    </TableCell>
                    <TableCell>
                      <RolePill role={pending.role} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{pending.invitedByName ?? "-"}</TableCell>
                    <TableCell className="text-xs">
                      {pending.status === "expired" ? (
                        <span className="text-destructive">Expired {formatDateTime(pending.expiresAt)}</span>
                      ) : (
                        <span className="text-muted-foreground">{formatDateTime(pending.expiresAt)}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-6 py-6 text-sm text-muted-foreground">No invitations are waiting to be accepted.</p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) resetInviteForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a platform admin</DialogTitle>
            <DialogDescription>
              They will get an email with a link that expires in 7 days. They set their own password and enroll an
              authenticator app before they can sign in.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Full name</Label>
              <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Work email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@tecres.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as PlatformAdminRole)}>
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLE_OPTIONS.find((o) => o.value === role)?.description}</p>
            </div>
            {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending && <Loader2 className="size-4 animate-spin" />}
                Send invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!roleTarget} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change platform role</DialogTitle>
            <DialogDescription>
              {roleTarget?.role === "platform_owner"
                ? `${roleTarget?.admin.name} will be able to suspend workspaces, adjust quotas, force password resets, and invite other platform admins.`
                : `${roleTarget?.admin.name} will lose the ability to change workspaces or invite admins, keeping read access and alert resolution.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleRoleChange} disabled={updateRole.isPending}>
              {updateRole.isPending && <Loader2 className="size-4 animate-spin" />}
              Change to {roleTarget ? roleLabelMap[roleTarget.role] : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
