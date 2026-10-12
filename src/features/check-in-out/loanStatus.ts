import type { AssetAssignment } from "@/types";

const DAY_MS = 86_400_000;

export interface LoanStatus {
  /** Share of the loan period elapsed (0-100), or null when there's no due date. */
  percent: number | null;
  /** "3 days left", "Due today", "2 days overdue", ... */
  text: string;
  overdue: boolean;
  daysLeft: number | null;
}

/** How far through its loan period an active assignment is. `isOverdue` is the server's own
 * verdict (`GET /assignments`'s overdue list) and wins over the local clock. */
export function loanStatus(a: AssetAssignment, now: number, isOverdue: boolean): LoanStatus {
  if (!a.expectedReturnDate) return { percent: null, text: "No due date", overdue: isOverdue, daysLeft: null };
  const start = new Date(a.assignedAt).getTime();
  const end = new Date(a.expectedReturnDate).getTime();
  const percent = end > start ? ((now - start) / (end - start)) * 100 : 100;
  const daysLeft = Math.ceil((end - now) / DAY_MS);
  const overdue = isOverdue || now > end;
  const lateBy = Math.max(1, -daysLeft);
  const text = overdue
    ? `${lateBy} day${lateBy === 1 ? "" : "s"} overdue`
    : daysLeft === 0
      ? "Due today"
      : daysLeft === 1
        ? "Due tomorrow"
        : `${daysLeft} days left`;
  return { percent: overdue ? 100 : percent, text, overdue, daysLeft };
}
