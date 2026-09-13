import { Link } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { PlanStatusBadge } from "@/components/common/StatusBadge";
import { useOrgsQuery } from "./api";

export function PlatformOrgsListPage() {
  const { data: orgs, isLoading } = useOrgsQuery();

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Every workspace Tecres has created for a customer."
        actions={
          <Button size="sm" className="gap-1.5" asChild>
            <Link to="/platform/orgs/new">
              <Plus className="size-3.5" />
              New Workspace
            </Link>
          </Button>
        }
      />

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Organization</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Assets</TableHead>
              <TableHead>Last activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : orgs?.length ? (
              orgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <Link to={`/platform/orgs/${org.id}`} className="block">
                      <p className="font-medium text-foreground">{org.name}</p>
                      <p className="text-xs text-muted-foreground">{org.slug}</p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <PlanStatusBadge status={org.planStatus} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {org.userCount} / {org.userQuota}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {org.assetCount} / {org.assetQuota}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {org.lastActivityAt ? new Date(org.lastActivityAt).toLocaleDateString() : "-"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No organizations yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
