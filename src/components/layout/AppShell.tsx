import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { MobileDrawer } from "./MobileDrawer";
import { CommandPalette } from "./CommandPalette";

export function AppShell({ children }: { children: ReactNode }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-row bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
        <Header
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />
        <main className="mx-auto w-full max-w-7xl flex-1 p-3.5 sm:p-5 lg:p-6">{children}</main>

        <footer className="mt-auto hidden border-t border-border px-6 py-4 text-xs text-muted-foreground lg:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <span>© 2026 Tecres Asset Manager</span>
            <div className="flex items-center gap-4">
              <span className="cursor-pointer hover:text-foreground">Documentation</span>
              <span className="cursor-pointer hover:text-foreground">Support</span>
            </div>
          </div>
        </footer>
      </div>

      <MobileNav onOpenMore={() => setIsMobileMenuOpen(true)} />
      <MobileDrawer isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </div>
  );
}
