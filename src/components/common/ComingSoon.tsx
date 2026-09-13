import type { LucideIcon } from "lucide-react";
import { PageHeader } from "./PageHeader";

/**
 * Placeholder for routes not yet fleshed out in Phase 1. Keeps every nav item live and
 * navigable inside the real AppShell so the full route tree (plan §L) can be reviewed
 * end-to-end before each page gets its own mock-data pass.
 */
export function ComingSoon({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-24 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Coming up in Phase 1</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          This page's mock UI hasn't been built out yet — the nav, shell, and routing around it are live.
        </p>
      </div>
    </div>
  );
}
