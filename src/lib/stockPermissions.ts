// Who may change a stock number, and how.
//
//   ADMIN                  → writes stock directly
//   MANAGER, STAFF         → may change stock, but only via an admin-approval request
//   SALES, ACCOUNTANT, ... → read-only: stock inputs are disabled, no requests allowed
//
// Mirrors STOCK_EDIT_ROLES in backend/src/middlewares/auth.middleware.ts —
// keep the two in sync. The backend enforces it regardless of what the UI does.

export type StockRole = string | undefined | null;

export const canEditStock = (role: StockRole): boolean =>
  role === "ADMIN" || role === "MANAGER" || role === "STAFF";

export const stockNeedsApproval = (role: StockRole): boolean =>
  role === "MANAGER" || role === "STAFF";

// "g" + "s" = "gs" looked like a typo in the UI; metric symbols never take an "s".
const SYMBOL_UNITS = new Set(["g", "kg", "mg", "l", "ml", "cl", "oz", "lb", "lbs"]);
export const pluralUnit = (unit: string): string =>
  SYMBOL_UNITS.has(unit.toLowerCase()) ? unit : `${unit}s`;
