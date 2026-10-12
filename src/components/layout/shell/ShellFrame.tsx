import type { ReactNode } from "react";

interface ShellFrameProps {
  sidebar: ReactNode;
  header: ReactNode;
  /** Phone-only bottom navigation. */
  dock?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * The page skeleton both the tenant app and the platform admin app render inside. The whole
 * viewport is the deep brand frame; the sidebar sits directly on it and the page lives in a
 * rounded canvas panel that scrolls on its own (desktop). On phones the frame becomes the top bar
 * and the canvas slides up under it with rounded corners.
 *
 * Colors all come from index.css tokens (--frame, --canvas, .shell-nav/.shell-topbar sets), so
 * org branding reaches the shell only through applyOrgTheme.
 */
export function ShellFrame({ sidebar, header, dock, footer, children }: ShellFrameProps) {
  return (
    <div className="app-canvas flex min-h-dvh bg-frame lg:h-dvh lg:overflow-hidden">
      {sidebar}
      <div
        data-shell-scroll
        className="flex min-w-0 flex-1 flex-col lg:my-3 lg:mr-3 lg:overflow-y-auto lg:rounded-[1.75rem] lg:bg-canvas lg:shadow-[0_0_0_1px_var(--frame-divider)]"
      >
        {header}
        <div className="flex flex-1 flex-col rounded-t-[1.5rem] bg-canvas lg:rounded-none">
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-6 lg:pb-8">{children}</main>
          {footer}
        </div>
      </div>
      {dock}
    </div>
  );
}
