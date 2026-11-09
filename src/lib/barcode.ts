// frontend/src/lib/barcode.ts
//
// Mirror of backend/src/utils/barcode.ts (frontend flavour: never throws,
// returns "" for empty). A barcode saved as "8000810101937.00" can't be
// matched by a scanner, which reads "8000810101937". Use this whenever a
// barcode is saved, indexed, or compared against a scanned code.

const INVISIBLES = /[​-‍﻿ \r\n\t]/g;
const TRAILING_ZERO_DECIMAL = /^(\d+)\.0+$/;

export function normalizeBarcode(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  const cleaned = String(raw).replace(INVISIBLES, "").trim();
  const m = TRAILING_ZERO_DECIMAL.exec(cleaned);
  return m ? m[1] : cleaned;
}
