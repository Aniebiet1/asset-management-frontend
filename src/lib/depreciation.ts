import { differenceInCalendarMonths, parseISO } from "date-fns";

export interface DepreciationResult {
  /** Depreciated book value today, floored at the asset's salvage value. */
  currentValue: number;
  /** 0-100 under normal inputs (accumulated depreciation is capped by the useful-life month cap below). */
  percentDepreciated: number;
  /** Months between purchase and now, capped at the category's useful life. */
  monthsElapsed: number;
}

/**
 * Straight-line depreciation, matching `assets.depreciationType === "straight_line"` (the only
 * method the backend schema currently defines - see BUILD_PLAN.md Phase 8). This is the single
 * shared implementation every place that shows a depreciation number should go through (the
 * Reports table today; asset detail and the dashboard valuation card are expected future callers
 * per the phase notes) so a second, slightly different formula never creeps in elsewhere:
 *
 *   monthsElapsed        = min(usefulLifeMonths, monthsBetween(purchaseDate, now))
 *   accumulatedDepr       = (purchasePrice - salvageValue) * (monthsElapsed / usefulLifeMonths)
 *   currentValue          = max(salvageValue, purchasePrice - accumulatedDepr)
 *   percentDepreciated    = accumulatedDepr / (purchasePrice - salvageValue) * 100
 */
export function computeDepreciation(
  purchasePrice: number,
  salvageValue: number,
  purchaseDate: string | Date | null | undefined,
  usefulLifeMonths: number
): DepreciationResult {
  if (!purchaseDate || !usefulLifeMonths || usefulLifeMonths <= 0) {
    return { currentValue: purchasePrice, percentDepreciated: 0, monthsElapsed: 0 };
  }

  const purchase = typeof purchaseDate === "string" ? parseISO(purchaseDate) : purchaseDate;
  if (isNaN(purchase.getTime())) {
    return { currentValue: purchasePrice, percentDepreciated: 0, monthsElapsed: 0 };
  }

  const monthsElapsed = Math.min(usefulLifeMonths, Math.max(0, differenceInCalendarMonths(new Date(), purchase)));
  const depreciableBase = purchasePrice - salvageValue;

  // Nothing to depreciate (salvage value at or above purchase price) - book value never moves.
  if (depreciableBase <= 0) {
    return { currentValue: purchasePrice, percentDepreciated: 0, monthsElapsed };
  }

  const accumulatedDepreciation = depreciableBase * (monthsElapsed / usefulLifeMonths);
  const currentValue = Math.max(salvageValue, purchasePrice - accumulatedDepreciation);
  const percentDepreciated = (accumulatedDepreciation / depreciableBase) * 100;

  return { currentValue, percentDepreciated, monthsElapsed };
}
