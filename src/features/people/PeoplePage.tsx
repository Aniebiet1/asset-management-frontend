import { useState } from "react";
import {
  Loader2,
  Mail,
  UserX,
  CheckCircle2,
  XCircle,
  Lock,
  ShieldAlert,
  RotateCw,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/ui/form";
import { PageHeader } from "@/components/common/PageHeader";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime, formatRelativeTime, getInitials } from "@/lib/format";
import { roleLabelMap } from "@/lib/status";
import { ApiError } from "@/lib/http-error";
import { useAuthStore } from "@/store/auth.store";
import { useDepartmentsQuery } from "@/features/catalog/api";
import {
  usePeopleQuery,
  useUpdatePersonMutation,
  useDeactivatePersonMutation,
  useInvitePersonMutation,
  usePendingInvitesQuery,
  useResendInviteMutation,
  useRevokeInviteMutation,
  useLoginActivityQuery,
} from "@/features/people/api";
import type { ActivityLogEntry, PersonInvite, User, UserRole } from "@/types";

const LOGIN_ACTIVITY_VISUALS: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  login_success: { label: "Signed in successfully", icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" },
  login_failed: { label: "Failed sign-in attempt", icon: XCircle, className: "text-amber-600 dark:text-amber-400" },
  login_failed_lockout: { label: "Failed sign-in, account locked", icon: Lock, className: "text-rose-600 dark:text-rose-400" },
  login_blocked_locked: { label: "Sign-in blocked, account was locked", icon: Lock, className: "text-rose-600 dark:text-rose-400" },
  totp_challenge_failed: { label: "Incorrect authentication code", icon: ShieldAlert, className: "text-amber-600 dark:text-amber-400" },
};

function LastSignIn({ person, onView }: { person: User; onView?: () => void }) {
  const isLocked = !!person.lockedUntil && new Date(person.lockedUntil).getTime() > Date.now();

  const content = (
    <>
      {isLocked ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
          <Lock className="size-3" />
          Locked
        </span>
      ) : person.lastLoginAt ? (
        <span className={cn("text-sm text-foreground", onView && "group-hover:underline")}>
          {formatRelativeTime(person.lastLoginAt)}
        </span>
      ) : (
        <span className={cn("text-sm text-muted-foreground", onView && "group-hover:underline")}>Never signed in</span>
      )}
      {!isLocked && person.failedLoginAttempts > 0 && (
        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">{person.failedLoginAttempts} recent failed attempt(s)</span>
      )}
    </>
  );

  if (!onView) {
    return <div className="flex flex-col items-start gap-0.5">{content}</div>;
  }

  return (
    <button type="button" onClick={onView} className="group flex flex-col items-start gap-0.5 text-left" title="View sign-in activity">
      {content}
    </button>
  );
}

const roleOptions: UserRole[] = ["super_admin", "admin", "asset_manager", "staff"];

interface EditFormState {
  name: string;
  role: UserRole;
  title: string;
  departmentId: string;
  phone: string;
  isActive: boolean;
}

export function PeoplePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const canManage = hasPermission(currentUser?.role, "canManagePeople");

  const people = usePeopleQuery();
  const departments = useDepartmentsQuery();
  const updatePerson = useUpdatePersonMutation();
  const deactivatePerson = useDeactivatePersonMutation();
  const invitePerson = useInvitePersonMutation();
  const pendingInvites = usePendingInvitesQuery();
  const resendInvite = useResendInviteMutation();
  const revokeInvite = useRevokeInviteMutation();

  const [editing, setEditing] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("staff");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const [activityTarget, setActivityTarget] = useState<User | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<PersonInvite | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const loginActivity = useLoginActivityQuery(activityTarget?.id);

  const rows = people.data ?? [];
  const departmentMap = new Map((departments.data ?? []).map((d) => [d.id, d.name]));

  function openEdit(user: User) {
    setEditing(user);
    setEditForm({
      name: user.name,
      role: user.role,
      title: user.title ?? "",
      departmentId: user.departmentId ?? "none",
      phone: user.phone ?? "",
      isActive: user.isActive,
    });
    setEditError(null);
  }

  function closeEdit() {
    setEditing(null);
    setEditForm(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !editForm) return;
    setEditError(null);
    setIsSaving(true);
    try {
      await updatePerson.mutateAsync({
        id: editing.id,
        data: {
          name: editForm.name.trim(),
          role: editForm.role,
          title: editForm.title.trim() || undefined,
          departmentId: editForm.departmentId === "none" ? null : editForm.departmentId,
          phone: editForm.phone.trim() || undefined,
          isActive: editForm.isActive,
        },
      });
      toast.success("Person updated");
      closeEdit();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Couldn't save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      await deactivatePerson.mutateAsync(deactivateTarget.id);
      toast.success(deactivateTarget.name + " deactivated");
      setDeactivateTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't deactivate this person.");
    } finally {
      setIsDeactivating(false);
    }
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setIsInviting(true);
    try {
      await invitePerson.mutateAsync({ email: inviteEmail.trim(), role: inviteRole });
      toast.success("Invitation sent to " + inviteEmail.trim());
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("staff");
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : "Couldn't send this invitation. Please try again.");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleResendInvite(invite: PersonInvite) {
    setResendingId(invite.id);
    try {
      await resendInvite.mutateAsync(invite.id);
      toast.success("Invitation resent to " + invite.email);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't resend this invitation.");
    } finally {
      setResendingId(null);
    }
  }

  async function handleRevokeInvite() {
    if (!revokeTarget) return;
    setIsRevoking(true);
    try {
      await revokeInvite.mutateAsync(revokeTarget.id);
      toast.success("Invitation to " + revokeTarget.email + " revoked");
      setRevokeTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't revoke this invitation.");
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="People"
        description={
          people.isLoading ? "Loading staff members..." : rows.length + " staff members in your organization"
        }
        actions={
          canManage && (
            <Button size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}>
              <Mail className="size-3.5" />
              Invite Person
            </Button>
          )
        }
      />

      {people.isLoading ? (
        <Card className="overflow-hidden p-0">
          <div className="space-y-2 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">No people yet.</CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden p-0 lg:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last sign-in</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{roleLabelMap[u.role]}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.employeeId}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.title ?? "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.departmentId ? (departmentMap.get(u.departmentId) ?? "-") : "-"}
                    </TableCell>
                    <TableCell>
                      <span className={"text-xs font-medium " + (u.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <LastSignIn person={u} onView={canManage ? () => setActivityTarget(u) : undefined} />
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(u)}>
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={u.id === currentUser?.id || !u.isActive}
                            title={u.id === currentUser?.id ? "You can't deactivate your own account." : undefined}
                            className="gap-1 text-destructive hover:text-destructive"
                            onClick={() => setDeactivateTarget(u)}
                          >
                            <UserX className="size-3.5" />
                            Deactivate
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {rows.map((u) => (
              <Card key={u.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                        {getInitials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{u.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-medium",
                        u.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      )}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div>
                      <p className="text-muted-foreground">Role</p>
                      <p className="font-medium text-foreground">{roleLabelMap[u.role]}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Employee ID</p>
                      <p className="font-medium text-foreground">{u.employeeId}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Title</p>
                      <p className="truncate font-medium text-foreground">{u.title ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="truncate font-medium text-foreground">
                        {u.departmentId ? (departmentMap.get(u.departmentId) ?? "-") : "-"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Last sign-in</p>
                      <LastSignIn person={u} onView={canManage ? () => setActivityTarget(u) : undefined} />
                    </div>
                  </div>
                  {canManage && (
                    <div className="mt-3 flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => openEdit(u)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={u.id === currentUser?.id || !u.isActive}
                        title={u.id === currentUser?.id ? "You can't deactivate your own account." : undefined}
                        className="flex-1 gap-1 text-destructive hover:text-destructive"
                        onClick={() => setDeactivateTarget(u)}
                      >
                        <UserX className="size-3.5" />
                        Deactivate
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {canManage && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Pending invitations</CardTitle>
            <p className="text-xs text-muted-foreground">
              Invites that haven't been accepted yet. Resend if the email didn't arrive or the link expired.
            </p>
          </CardHeader>
          <CardContent className="px-0">
            {pendingInvites.isLoading ? (
              <div className="px-6">
                <Skeleton className="h-10 w-full" />
              </div>
            ) : pendingInvites.data?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invitee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited by</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.data.map((invite) => {
                    const isExpired = new Date(invite.expiresAt).getTime() < Date.now();
                    const isResending = resendingId === invite.id;
                    return (
                      <TableRow key={invite.id}>
                        <TableCell className="text-sm font-medium text-foreground">{invite.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{roleLabelMap[invite.role]}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{invite.invitedByName ?? "-"}</TableCell>
                        <TableCell className="text-xs">
                          {isExpired ? (
                            <span className="text-rose-600 dark:text-rose-400">Expired {formatDateTime(invite.expiresAt)}</span>
                          ) : (
                            <span className="text-muted-foreground">{formatDateTime(invite.expiresAt)}</span>
                          )}
                          {invite.resendCount > 0 && (
                            <p className="mt-0.5 text-muted-foreground">
                              Last sent {formatRelativeTime(invite.lastSentAt)}, resent {invite.resendCount}x
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              disabled={isResending}
                              onClick={() => handleResendInvite(invite)}
                            >
                              {isResending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <RotateCw className="size-3.5" />
                              )}
                              Resend
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-destructive hover:text-destructive"
                              onClick={() => setRevokeTarget(invite)}
                            >
                              <Ban className="size-3.5" />
                              Revoke
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="px-6 py-6 text-sm text-muted-foreground">No invitations are waiting to be accepted.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editing?.name}</DialogTitle>
            <DialogDescription>Update this person's role, title, department, or status.</DialogDescription>
          </DialogHeader>
          {editForm && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
                <FormField label="Name" htmlFor="edit-name" required className="sm:col-span-2">
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    required
                    onChange={(e) => setEditForm((f) => f && { ...f, name: e.target.value })}
                  />
                </FormField>
                <FormField label="Role" htmlFor="edit-role" required>
                  <Select
                    value={editForm.role}
                    onValueChange={(v) => setEditForm((f) => f && { ...f, role: v as UserRole })}
                  >
                    <SelectTrigger id="edit-role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => (
                        <SelectItem key={r} value={r}>
                          {roleLabelMap[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Department" htmlFor="edit-department">
                  <Select
                    value={editForm.departmentId}
                    onValueChange={(v) => setEditForm((f) => f && { ...f, departmentId: v })}
                  >
                    <SelectTrigger id="edit-department" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No department</SelectItem>
                      {(departments.data ?? []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Title" htmlFor="edit-title">
                  <Input
                    id="edit-title"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => f && { ...f, title: e.target.value })}
                  />
                </FormField>
                <FormField label="Phone" htmlFor="edit-phone">
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => f && { ...f, phone: e.target.value })}
                  />
                </FormField>
                <FormField label="Active" htmlFor="edit-active" className="sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="edit-active"
                      checked={editForm.isActive}
                      onCheckedChange={(checked) => setEditForm((f) => f && { ...f, isActive: checked })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {editForm.isActive ? "Active" : "Inactive (reactivate by toggling this on)"}
                    </span>
                  </div>
                </FormField>
              </div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeEdit}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="gap-1.5">
                  {isSaving && <Loader2 className="size-3.5 animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate {deactivateTarget?.name}?</DialogTitle>
            <DialogDescription>
              They will no longer be able to sign in. Their history and past assignments are kept, and an admin can
              reactivate them later from the Edit dialog.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeactivateTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={isDeactivating} className="gap-1.5" onClick={handleDeactivate}>
              {isDeactivating && <Loader2 className="size-3.5 animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a person</DialogTitle>
            <DialogDescription>
              They'll receive an email with a link to set their password and join your organization.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <FormField label="Email" htmlFor="invite-email" required>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                required
                placeholder="name@company.com"
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </FormField>
            <FormField label="Role" htmlFor="invite-role" required>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabelMap[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isInviting} className="gap-1.5">
                {isInviting ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                Send invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!activityTarget} onOpenChange={(open) => !open && setActivityTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sign-in activity: {activityTarget?.name}</DialogTitle>
            <DialogDescription>
              Recent sign-in attempts for this account, most recent first. This tracks whether their sign-ins
              succeeded or failed, not what they did once inside.
            </DialogDescription>
          </DialogHeader>
          {activityTarget && (
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {loginActivity.isLoading ? (
                <div className="space-y-2 py-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : loginActivity.data?.length ? (
                <div className="divide-y divide-border">
                  {loginActivity.data.map((entry: ActivityLogEntry) => {
                    const visual = LOGIN_ACTIVITY_VISUALS[entry.action] ?? {
                      label: entry.action,
                      icon: ShieldAlert,
                      className: "text-muted-foreground",
                    };
                    const Icon = visual.icon;
                    return (
                      <div key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon className={cn("size-4 shrink-0", visual.className)} />
                          <span className={cn("truncate text-sm font-medium", visual.className)}>{visual.label}</span>
                        </div>
                        <div className="shrink-0 text-right text-xs text-muted-foreground">
                          <p>{formatDateTime(entry.createdAt)}</p>
                          {entry.ipAddress && <p>{entry.ipAddress}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No sign-in activity recorded for this account yet.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActivityTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke invitation to {revokeTarget?.email}?</DialogTitle>
            <DialogDescription>
              Their invite link will stop working. You can invite this email again later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={isRevoking} className="gap-1.5" onClick={handleRevokeInvite}>
              {isRevoking && <Loader2 className="size-3.5 animate-spin" />}
              Revoke invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
