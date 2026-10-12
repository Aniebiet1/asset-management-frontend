import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { MobileDrawer } from "./MobileDrawer";
import { CommandPalette } from "./CommandPalette";
import { ShellFrame } from "./shell/ShellFrame";

export function AppShell({ children }: { children: ReactNode }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <ShellFrame
        sidebar={<Sidebar />}
        header={
          <Header
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          />
        }
        dock={<MobileNav onOpenMore={() => setIsMobileMenuOpen(true)} />}
        footer={
          <footer className="hidden px-8 pb-5 text-xs text-muted-foreground lg:block">
            <div className="mx-auto flex max-w-7xl items-center justify-between border-t border-border pt-4">
              <span>© 2026 TecresTrackIT AMS</span>
              <div className="flex items-center gap-4">
                <span className="cursor-pointer hover:text-foreground">Documentation</span>
                <span className="cursor-pointer hover:text-foreground">Support</span>
              </div>
            </div>
          </footer>
        }
      >
        {children}
      </ShellFrame>
      <MobileDrawer isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </>
  );
}
