import { MoreHorizontal } from "lucide-react";
import { BottomDock } from "./shell/BottomDock";
import { DOCK_ITEMS } from "./tenantNav";

export function MobileNav({ onOpenMore }: { onOpenMore: () => void }) {
  return <BottomDock items={DOCK_ITEMS} more={{ label: "More", icon: MoreHorizontal, onClick: onOpenMore }} />;
}
