import { useCallback, useMemo } from "react";
import { computeDepreciation } from "@/lib/depreciation";
import { useCategoriesQuery } from "@/features/catalog/api";
import type { Asset } from "@/types";

export interface AssetValue {
  /** Null when the asset has neither a recorded current value nor a purchase price. */
  value: number | null;
  /** True when the value was computed (straight-line), not recorded on the asset. */
  estimated: boolean;
}

/**
 * `assets.currentValue` is an optional override: the asset form says "leave blank to let
 * depreciation compute it", and the backend then stores its column default, 0.00. Showing that as
 * a currency reads as "worth nothing", so every place that displays an asset's value goes through this:
 * the recorded value when there is one, otherwise straight-line depreciation from the purchase
 * price over the asset type's useful life (the same formula Reports uses, lib/depreciation.ts).
 */
export function assetValue(asset: Pick<Asset, "currentValue" | "purchasePrice" | "salvageValue" | "purchaseDate">, usefulLifeMonths?: number): AssetValue {
  const purchase = asset.purchasePrice == null || asset.purchasePrice === "" ? null : Number(asset.purchasePrice);
  const recorded = asset.currentValue == null || asset.currentValue === "" ? null : Number(asset.currentValue);
  // The column defaults to 0.00 (NOT NULL), so "left blank on the form" arrives as 0. A real
  // recorded value of 0 on something that cost money is indistinguishable from that, and the
  // estimate below floors at salvage value anyway, so 0 with a purchase price means "not set".
  if (recorded != null && !(recorded === 0 && (purchase ?? 0) > 0)) return { value: recorded, estimated: false };
  if (purchase == null) return { value: null, estimated: false };
  if (!usefulLifeMonths) return { value: purchase, estimated: true };
  const salvage = asset.salvageValue != null && asset.salvageValue !== "" ? Number(asset.salvageValue) : 0;
  return { value: computeDepreciation(purchase, salvage, asset.purchaseDate, usefulLifeMonths).currentValue, estimated: true };
}

/** `assetValue` with each asset's useful life looked up from its asset type. */
export function useAssetValue() {
  const categories = useCategoriesQuery();
  const lifeByCategory = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c.usefulLifeMonths] as const)), [categories.data]);
  return useCallback(
    (asset: Pick<Asset, "currentValue" | "purchasePrice" | "salvageValue" | "purchaseDate" | "categoryId">) =>
      assetValue(asset, lifeByCategory.get(asset.categoryId)),
    [lifeByCategory]
  );
}
