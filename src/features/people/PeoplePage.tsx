import { useState } from "react";
import { Loader2, Mail, UserX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { getInitials } from "@/lib/format";
import { roleLabelMap } from "@/lib/status";
import { ApiError } from "@/lib/http-error";
import { useAuthStore } from "@/store/auth.store";
import { useDepartmentsQuery } from "@/features/catalog/api";
import {
  usePeopleQuery,
  useUpdatePersonMutation,
  useDeactivatePersonMutation,
  useInvitePersonMutation,
} from "@/features/people/api";
import type { User, UserRole } from "@/types";

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
                      <span className={"text-xs font-medium " + (u.isActive ? "text-emerald-400" : "text-muted-foreground")}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
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
                        u.isActive ? "text-emerald-400" : "text-muted-foreground"
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
    </div>
  );
}
