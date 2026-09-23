import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useAssetsQuery } from "@/features/assets/api";
import type { Asset } from "@/types";

/**
 * Search/pick an existing asset of the same type to attach a new one to (adding an A/B/C... suffix
 * to its shared index) - for when several identical items were bought on one invoice. Any prior
 * asset of this type can be picked, not just the most recently created one (see assetTags.service.ts
 * assembleTag on the backend, which validates the picked index exists rather than requiring it be
 * the latest).
 */
export function DuplicateAssetPicker({
  categoryId,
  value,
  onSelect,
}: {
  categoryId: string;
  value: Asset | null;
  onSelect: (asset: Asset) => void;
}) {
  const [open, setOpen] = useState(false);
  const candidates = useAssetsQuery({ categoryId, pageSize: 50 }, { enabled: open && !!categoryId });
  const items = candidates.data?.data ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {value ? (
            <span className="truncate">
              <span className="font-mono text-xs">{value.assetTag}</span>
              <span className="text-muted-foreground"> - {value.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Search existing items of this type...</span>
          )}
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(28rem,90vw)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name or tag..." />
          <CommandList>
            <CommandEmpty>{candidates.isLoading ? "Loading..." : "No matching items found."}</CommandEmpty>
            <CommandGroup>
              {items.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`${a.assetTag} ${a.name}`}
                  onSelect={() => {
                    onSelect(a);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-3.5 shrink-0", value?.id === a.id ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{a.name}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{a.assetTag}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
