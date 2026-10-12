import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

/**
 * Ported from ink-asset-management/src/lib/utils.ts (plan §M: "port with light adaptation").
 * formatCurrency is upgraded per plan §F to key off Intl.NumberFormat + the org's ISO
 * currency code, falling back to symbol-prefix concatenation for non-ISO codes.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "NGN",
  currencySymbol = "₦"
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return `${currencySymbol}0.00`;
  }
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(num);
  } catch {
    return `${currencySymbol}${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

/** Short currency for tight spaces (e.g. "₦48.3M"); the full figure belongs in a title/tooltip. */
export function formatCompactCurrency(amount: number | string | null | undefined, currency = "NGN", currencySymbol = "₦"): string {
  const num = Number(amount ?? 0);
  if (isNaN(num)) return `${currencySymbol}0`;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(num);
  } catch {
    return `${currencySymbol}${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(num)}`;
  }
}

export function formatDate(date: string | Date | null | undefined, dateFormat = "MMM dd, yyyy"): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, dateFormat);
  } catch {
    return String(date);
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "MMM dd, yyyy hh:mm a");
  } catch {
    return String(date);
  }
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return `${formatDistanceToNowStrict(d)} ago`;
  } catch {
    return String(date);
  }
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function getInitials(name: string): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function generateRandomCode(prefix: string, length = 6): string {
  const chars = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
}
