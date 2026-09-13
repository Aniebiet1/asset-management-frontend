import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { hasPermission } from "@/lib/permissions";
import { getInitials } from "@/lib/format";
import { roleLabelMap } from "@/lib/status";
import { mockUsers } from "@/lib/mock-data";
import { useAuthStore } from "@/store/auth.store";

export function PeoplePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const canManage = hasPermission(currentUser?.role, "canManagePeople");

  return (
    <div>
      <PageHeader
        title="People"
        description={`${mockUsers.length} staff members in your organization`}
        actions={
          canManage && (
            <Button size="sm" className="gap-1.5">
              <Plus className="size-3.5" />
              Invite Person
            </Button>
          )
        }
      />
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockUsers.map((u) => (
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
                <TableCell>
                  <span className={`text-xs font-medium ${u.isActive ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
