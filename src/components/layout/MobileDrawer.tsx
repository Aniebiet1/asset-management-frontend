import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { roleLabelMap } from "@/lib/status";
import { useAuthStore } from "@/store/auth.store";
import { NavSheetBody } from "./shell/NavSheetBody";
import { BrandMark } from "./shell/BrandMark";
import { SETTINGS_ITEM, canSeeSettings, tenantNavSections } from "./tenantNav";

export function MobileDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const org = useAuthStore((s) => s.org);
  const currentUser = useAuthStore((s) => s.currentUser);
  const sections = tenantNavSections(currentUser?.role);
  if (canSeeSettings(currentUser?.role)) sections.push({ label: "Workspace", items: [SETTINGS_ITEM] });

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="left" className="shell-nav w-[min(20rem,85vw)] gap-0 border-0 bg-nav p-0 text-nav-foreground">
        <SheetHeader className="border-b border-nav-divider px-4 py-4">
          <div className="flex items-center gap-3">
            <BrandMark logoUrl={org?.logoUrl} name={org?.name ?? "Workspace"} />
            <div className="min-w-0">
              <SheetTitle className="truncate text-sm font-semibold text-nav-foreground">{org?.name ?? "Workspace"}</SheetTitle>
              <SheetDescription className="truncate text-[11px] text-nav-muted">
                {currentUser ? `${currentUser.name}, ${roleLabelMap[currentUser.role]}` : "Asset workspace"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <NavSheetBody sections={sections} onNavigate={onClose} />
      </SheetContent>
    </Sheet>
  );
}
