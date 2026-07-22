// frontend/src/lib/receiptPdf.ts
//
// Generates an 80mm receipt/invoice as a downloadable PDF using jsPDF —
// entirely client-side, no browser print dialog involved. This exists as a
// fallback for staff whose Chrome/Windows setup hangs on the print-preview
// pane ("Loading preview…" that never resolves) — a `doc.save()` here is a
// plain file download, so it can't be affected by that class of bug at all.
//
// Uses an embedded, subsetted Noto Sans (see receiptFontData.ts) instead of
// jsPDF's built-in Courier/Helvetica/Times — those "standard 14" PDF fonts
// don't include a Naira glyph, so ₦ would render as a missing-character box
// without a custom font embedded.
import jsPDF from "jspdf";
import {
  NOTO_SANS_REGULAR_BASE64,
  NOTO_SANS_BOLD_BASE64,
} from "./receiptFontData";

export type ReceiptLine =
  | { type: "center"; text: string; bold?: boolean; size?: number }
  | { type: "left"; text: string; bold?: boolean; size?: number }
  | { type: "row"; left: string; right: string; bold?: boolean; size?: number }
  | { type: "hr" }
  | { type: "space"; mm?: number };

const PAGE_WIDTH_MM = 80;
const MARGIN_MM = 5;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const DEFAULT_SIZE = 9; // pt
const PT_TO_MM = 0.352778;
const HR_GAP_MM = 2; // clearance above AND below each horizontal rule

// A text line's vertical rhythm, in mm, derived from its font size in pt.
// These are deliberately generous (real font metrics vary by glyph/font,
// and being too tight is exactly what caused the "rule strikes through the
// text above it" bug previously — see the fix history below) rather than
// trying to pull exact ascent/descent values out of the font file.
function ascentMm(sizePt: number): number {
  return sizePt * PT_TO_MM * 0.8;
}
function descentMm(sizePt: number): number {
  return sizePt * PT_TO_MM * 0.3;
}
function lineHeightMm(sizePt: number): number {
  // ascent + descent + a little extra leading so consecutive lines at the
  // same size don't feel cramped
  return sizePt * PT_TO_MM * 1.55;
}

export function money(n: number): string {
  return `₦${Math.round(n || 0).toLocaleString()}`;
}

// Simple character-count word-wrap for product names etc — avoids needing
// a live jsPDF instance just to measure text width, so we can compute the
// page height up front (jsPDF's page size is fixed at creation time; there's
// no "auto height, trim to content" mode).
export function wrapText(text: string, maxChars = 34): string[] {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function estimateHeightMm(lines: ReceiptLine[]): number {
  let h = MARGIN_MM * 2;
  for (const l of lines) {
    if (l.type === "hr") h += HR_GAP_MM * 2 + 0.3;
    else if (l.type === "space") h += l.mm ?? 3;
    else h += lineHeightMm(l.size ?? DEFAULT_SIZE);
  }
  return Math.max(60, h);
}

let fontRegistered = false;
function ensureFont(doc: jsPDF) {
  // addFont/addFileToVFS register into jsPDF's global font registry, but
  // re-registering the same font on every single PDF is harmless and cheap
  // (a few KB of base64 decode) — done per-instance to keep this function
  // self-contained and safe to call from anywhere without needing a shared
  // singleton jsPDF instance.
  doc.addFileToVFS("NotoSans-Regular.ttf", NOTO_SANS_REGULAR_BASE64);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", NOTO_SANS_BOLD_BASE64);
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  fontRegistered = true;
}

export function buildReceiptPdf(lines: ReceiptLine[]): jsPDF {
  const height = estimateHeightMm(lines);
  const doc = new jsPDF({
    unit: "mm",
    format: [PAGE_WIDTH_MM, height],
  });
  ensureFont(doc);
  doc.setFont("NotoSans", "normal");

  // BUG FIX (PDF rules striking through the text above them): the previous
  // version placed each horizontal rule using a fixed, too-small gap before
  // the *next* line's baseline (1.5mm), without accounting for how far a
  // line of text actually extends ABOVE its own baseline (its "ascent").
  // At 9pt that ascent is ~2.4mm — more than the old 1.5mm gap — so the
  // rule landed inside the letters instead of below them. Every element
  // below now reserves its own ascent (before drawing) and descent (after
  // drawing) explicitly, and a rule gets a fixed clearance on both sides,
  // so nothing can overlap regardless of font size.
  let y = MARGIN_MM;
  for (const l of lines) {
    if (l.type === "hr") {
      y += HR_GAP_MM;
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.15);
      doc.line(MARGIN_MM, y, PAGE_WIDTH_MM - MARGIN_MM, y);
      y += HR_GAP_MM;
      continue;
    }
    if (l.type === "space") {
      y += l.mm ?? 3;
      continue;
    }

    const size = l.size ?? DEFAULT_SIZE;
    doc.setFont("NotoSans", l.bold ? "bold" : "normal");
    doc.setFontSize(size);
    y += ascentMm(size);

    if (l.type === "center") {
      doc.text(l.text, PAGE_WIDTH_MM / 2, y, { align: "center" });
    } else if (l.type === "left") {
      doc.text(l.text, MARGIN_MM, y);
    } else if (l.type === "row") {
      doc.text(l.left, MARGIN_MM, y);
      doc.text(l.right, PAGE_WIDTH_MM - MARGIN_MM, y, { align: "right" });
    }
    y += descentMm(size) + (lineHeightMm(size) - ascentMm(size) - descentMm(size));
  }

  return doc;
}

export function downloadReceiptPdf(lines: ReceiptLine[], filename: string) {
  buildReceiptPdf(lines).save(filename);
}

export { CONTENT_WIDTH_MM };
