// frontend/src/lib/posReceipt.ts
//
// POS receipt building, printing, and PDF-download logic — used by both the
// POS orders list (admin/pos/orders/page.tsx) and the order detail page
// (admin/pos/orders/[id]/page.tsx).
//
// This used to live inside admin/pos/orders/page.tsx itself, with the
// detail page importing straight from that page.tsx file. Next.js's App
// Router treats every page.tsx as a special route-entry module, and
// importing plain business logic out of one page.tsx into another isn't a
// supported pattern — moved here on general principle even though it
// turned out NOT to be the cause of the "View" page getting stuck on
// "Loading…" forever. That was actually the print engine's iframe DOM
// manipulation conflicting with React's own reconciliation — see the full
// explanation right above openPrintWindow() below.
import {
  type ReceiptLine,
  downloadReceiptPdf,
  wrapText,
  money as pdfMoney,
  estimateHeightMm,
} from "./receiptPdf";
import { formatScaleQty } from "./utils";

// POSOrderItem (below) doesn't carry the product's scaleStep — it's a
// snapshot of a completed sale, not live product config, and scaleStep
// was never persisted per line item. Rather than fall back to
// formatScaleQty's generic 2-decimal default here (which would still
// under-represent a fine step like 0.005, the same bug this is fixing
// elsewhere — see formatScaleQty in lib/utils.ts), force 3-decimal
// precision explicitly so a printed receipt never shows a rounder
// quantity than what the price was actually calculated from. A fully
// precise fix would snapshot the real scaleStep onto POSOrderItem at
// sale time — a schema change, out of scope here.
const RECEIPT_QTY_STEP = 0.001;

export interface POSOrderItem {
  id: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountApplied: number;
  netWeight?: string;
  scaleUnit?: string; // present for scalable products
  variationLabel?: string | null; // present when this line is a specific preset/variation
}

export interface POSOrder {
  id: string;
  posOrderNumber: string;
  receiptNumber: string;
  status: "OPEN" | "SUSPENDED" | "COMPLETED" | "VOIDED" | "REFUNDED";
  paymentMethod: "CASH" | "CARD" | "TRANSFER" | "SPLIT";
  subtotal: number;
  discountAmount: number;
  total: number;
  amountTendered?: number;
  changeGiven?: number;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  items: POSOrderItem[];
  processedBy: { name: string; role: string };
}

// ── Receipt HTML builder ──────────────────────────────────────────────────────
// `copyLabel`: shown at the bottom of the receipt so cashiers can tell the
// customer's copy apart from the in-house (merchant) copy at a glance.
// Builds just the printable body content for ONE copy — no <!DOCTYPE>,
// <html>, <head>, or <style>. Shared by both buildReceiptHtml (single
// copy) and buildBothReceiptsHtml (continuous customer+merchant copy in
// one print job) below, so the two can never visually drift apart.
function buildReceiptBody(
  order: POSOrder,
  copyLabel: "CUSTOMER COPY" | "MERCHANT COPY",
): string {
  const itemsHtml = order.items
    .map((item) => {
      const qtyLabel = item.variationLabel
        ? `${item.quantity}× pack`
        : item.scaleUnit
          ? `${formatScaleQty(item.quantity, RECEIPT_QTY_STEP)} ${item.scaleUnit}`
          : String(item.quantity);
      const priceLabel = item.variationLabel
        ? `&#8358;${item.unitPrice.toLocaleString()}/pack`
        : item.scaleUnit
          ? `&#8358;${item.unitPrice.toLocaleString()}/${item.scaleUnit}`
          : `&#8358;${item.unitPrice.toLocaleString()}`;
      const nameLine = item.variationLabel
        ? `${item.productName} — ${item.variationLabel}`
        : item.productName;
      return `
    <tr>
      <td style="padding:1mm 0;"><strong>${nameLine}${item.discountApplied > 0 ? ` (-${item.discountApplied}%)` : ""}</strong></td>
      <td style="text-align:right;white-space:nowrap;"><strong>${qtyLabel}&times;${priceLabel}</strong></td>
      <td style="text-align:right;white-space:nowrap;"><strong>&#8358;${item.subtotal.toLocaleString()}</strong></td>
    </tr>
  `;
    })
    .join("");

  return `
    <div class="c" style="font-size:16px;"><strong>NigitTriple Supermarket</strong></div>
    <div class="c"><strong>30, Abuloma Road (Bozgomero Estate)</strong></div>
    <div class="c"><strong>Port Harcourt · +234 916 977 6138</strong></div>
    <hr/>
    <div class="c"><strong>${order.receiptNumber}</strong></div>
    <div class="c"><strong>${new Date(order.createdAt).toLocaleString("en-NG")}</strong></div>
    ${order.customerName ? `<div class="c"><strong>Customer: ${order.customerName}</strong></div>` : ""}
    <div class="c"><strong>Staff: ${order.processedBy?.name || "—"}</strong></div>
    <hr/>
    <table>
      <colgroup><col style="width:45%"/><col style="width:30%"/><col style="width:25%"/></colgroup>
      <tbody>${itemsHtml}</tbody>
    </table>
    <hr/>
    <table>
      ${order.discountAmount > 0 ? `<tr><td><strong>Discount</strong></td><td class="r"><strong>-&#8358;${order.discountAmount.toLocaleString()}</strong></td></tr>` : ""}
      <tr class="total-row"><td><strong>TOTAL</strong></td><td class="r"><strong>&#8358;${order.total.toLocaleString()}</strong></td></tr>
      <tr><td><strong>Payment</strong></td><td class="r"><strong>${order.paymentMethod}</strong></td></tr>
      ${order.amountTendered ? `<tr><td><strong>Tendered</strong></td><td class="r"><strong>&#8358;${order.amountTendered.toLocaleString()}</strong></td></tr>` : ""}
      ${order.changeGiven && order.changeGiven > 0 ? `<tr><td><strong>Change</strong></td><td class="r"><strong>&#8358;${order.changeGiven.toLocaleString()}</strong></td></tr>` : ""}
    </table>
    <hr/>
    <div class="c"><span class="copy-tag">${copyLabel}</span></div>
    <hr/>
    <div class="c" style="font-size:10px;"><strong>Software by Calstins Ltd · calstins.com</strong></div>
  `;
}

// Shared <head>/<style> for every printed receipt document below.
//
// @page uses a computed FIXED height, not "auto". "auto" is the
// standards-correct pattern for continuous-roll thermal printing and was
// tried first — but in production, several Windows/POS thermal printer
// drivers (this one included — see the photo that prompted this fix:
// even a single-item receipt got physically autocut mid-content) do NOT
// treat `size: 80mm auto` as truly unbounded. The driver falls back to
// its own internal page-length assumption regardless of what the CSS
// asked for, so content taller than that gets silently paginated by the
// driver — and the printer's autocutter fires at every page break it's
// given, landing wherever that arbitrary length happens to fall,
// including mid-line through content.
//
// A FIXED, explicit height is the one thing every page-based printer
// driver reliably honors — there's no "guess the unbounded roll length"
// step for it to get wrong. The catch is the OLD fixed-height version of
// this (before it was switched to "auto") used too THIN a safety margin
// and could still fall short on a long order, which is what motivated
// switching to "auto" in the first place. This computes the same
// per-line estimate already used for the PDF download path
// (estimateHeightMm + buildReceiptPdfLines — one shared source of truth
// for both outputs) but with a much more generous margin this time: 30%
// proportional headroom plus a flat buffer, rather than a thin flat-only
// pad. Slightly more blank paper at the tear line is a far smaller
// problem than the paper being autocut through actual receipt content.
// ONE-TIME PRINTER SETUP (Windows): register these 3 exact paper sizes as
// custom "forms" on the Xprinter driver (Control Panel → Devices and
// Printers → Xprinter → Printer properties → Advanced → New Form, or via
// Print Server Properties → Forms) — 80 x 120mm, 80 x 220mm, 80 x 350mm.
// Every receipt printed by this app requests exactly one of those three
// heights (see HEIGHT_TIERS_MM above), so once these forms exist the
// driver never has to guess/snap to a different preset.
function receiptStyleBlock(heightMm: number): string {
  return `
      @page { size: 80mm ${heightMm}mm; margin: 2mm 0; }
      html { zoom: 1 !important; }
      * { 
        box-sizing: border-box; 
        margin: 0; 
        padding: 0; 
        /* Maximize boldness and use text-stroke to artificially thicken the text font */
        font-weight: 900 !important; 
        -webkit-text-stroke: 0.4px black;
      }
      body { 
        font-family: 'Courier New', Courier, monospace; 
        font-size: 13px; /* Slightly bumped up for better receipt clarity */
        width: 76mm; 
        max-width: 76mm;
        margin: 0 auto; 
        line-height: 1.5; 
      }
      .c { text-align: center; }
      .r { text-align: right; }
      hr { border: none; border-top: 2px dashed #000; margin: 2mm 0; -webkit-text-stroke: none; }
      table { width: 100%; border-collapse: collapse; }
      .total-row td { 
        font-size: 16px; 
        border-top: 2px dashed #000;
        padding-top: 2mm; 
      }
      .copy-tag {
        display: inline-block;
        border: 2px solid #000;
        padding: 1mm 3mm;
        margin-top: 2mm;
        letter-spacing: 1px;
      }
      .cut-line {
        text-align: center;
        font-size: 11px;
        letter-spacing: 2px;
        margin: 6mm 0;
        -webkit-text-stroke: none;
      }
  `;
}

// Generous, explicit safety margin over the raw per-line estimate — see
// the big comment on receiptStyleBlock for why this needs to be much more
// forgiving than the old, thin flat-only padding that caused the
// original under-estimation bug.
//
// TIERING (fix for "prints and cuts in the middle" even after the above
// margin was added): most Windows/POS thermal printer drivers — this
// Xprinter included — don't actually accept an arbitrary custom @page
// height. They only recognise a short preset list of registered paper
// "forms". When the browser asks for a height that isn't in that list
// (which is virtually guaranteed with a computed, order-specific value
// like 187mm), the driver silently snaps to its nearest preset instead
// of the one requested — and that preset can easily be SHORTER than the
// actual content, which is exactly what produces a cut through the
// middle of a receipt.
//
// The fix is to stop asking for a unique height per receipt and instead
// always round UP to one of a small, fixed set of tiers.
//
// IMPORTANT — the top tier here is capped at 290mm, not higher. Checked
// directly in this printer's own Windows driver Properties dialog
// (Devices and Printers → printer → Properties → General → "Paper
// available"): it reports a hard maximum of 80 x 297mm. Asking for
// anything above that doesn't get a taller page — the driver just
// silently clips back down to its own 297mm ceiling and cuts there,
// mid-content, on any order long enough to need more. That's a
// hard driver/hardware limit; no CSS value raises it. If a different
// printer/driver reports a different max in its own Properties dialog,
// adjust this last number to match (a few mm under the reported max).
//
// This tiering can only help orders that fit under that true ceiling.
// For anything longer, there is NO fix available through the browser/OS
// print pipeline at all — this is exactly why the raw-USB print bridge
// (the desktop app) exists: it has no page-length concept whatsoever,
// so it's the only path with no ceiling. printBothReceiptsSmart below
// tries that path first for exactly this reason, falling back to this
// tiered approach only when the bridge isn't reachable.
const HEIGHT_TIERS_MM = [120, 220, 290];

function generousHeightMm(lines: ReceiptLine[]): number {
  const raw = Math.ceil(estimateHeightMm(lines) * 1.3) + 30;
  return (
    HEIGHT_TIERS_MM.find((tier) => tier >= raw) ??
    HEIGHT_TIERS_MM[HEIGHT_TIERS_MM.length - 1]
  );
}

// Single-copy document — still used by anything that only ever needs one
// copy at a time (kept for compatibility; printBothReceipts below is what
// the actual "Print" buttons call).
export function buildReceiptHtml(
  order: POSOrder,
  copyLabel: "CUSTOMER COPY" | "MERCHANT COPY",
): string {
  const heightMm = generousHeightMm(buildReceiptPdfLines(order, copyLabel));
  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <style>${receiptStyleBlock(heightMm)}</style>
  </head><body>${buildReceiptBody(order, copyLabel)}</body></html>`;
}

// ── Both copies, ONE continuous print job ───────────────────────────────
// Real POS receipt printers on continuous roll paper print a merchant
// copy immediately followed by a customer copy (or vice versa) as ONE
// unbroken strip, with a perforation or a plain dashed "cut here" line
// between them for the cashier to tear apart by hand — never two
// separate print jobs. Two separate jobs means two separate OS print
// dialogs/spooler entries and, depending on the printer driver, a paper
// cut or feed gap between them that a plain thermal roll doesn't actually
// have. This builds ONE document containing both copies back to back —
// see printBothReceipts further down, which now calls this once instead
// of opening two windows and calling print() twice.
export function buildBothReceiptsHtml(order: POSOrder): string {
  const merchantLines = buildReceiptPdfLines(order, "MERCHANT COPY");
  const customerLines = buildReceiptPdfLines(order, "CUSTOMER COPY");
  // Sum of both copies' own generous estimates, plus ~10mm for the
  // cut-line divider between them (margin: 6mm 0 + its own text line).
  const heightMm =
    generousHeightMm(merchantLines) + generousHeightMm(customerLines) + 10;
  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <style>${receiptStyleBlock(heightMm)}</style>
  </head><body>${buildReceiptBody(order, "MERCHANT COPY")}
    <div class="cut-line">✂ - - - - - - - - - - - - - - - - - - - - - - - - -</div>
    ${buildReceiptBody(order, "CUSTOMER COPY")}
  </body></html>`;
}

// ── Download as PDF — same content as buildReceiptHtml above, but as an
// actual file download via jsPDF. No iframe, no window.print(), no print
// dialog — this is the fallback for whenever the browser's own
// print-preview pipeline is what's broken (see lib/receiptPdf.ts). ────────
function buildReceiptPdfLines(
  order: POSOrder,
  copyLabel: "CUSTOMER COPY" | "MERCHANT COPY",
): ReceiptLine[] {
  const lines: ReceiptLine[] = [
    { type: "center", text: "NigitTriple Supermarket", bold: true, size: 11 },
    { type: "center", text: "30, Abuloma Road (Bozgomero Estate)" },
    { type: "center", text: "Port Harcourt · +234 916 977 6138" },
    { type: "hr" },
    { type: "center", text: order.receiptNumber, bold: true },
    {
      type: "center",
      text: new Date(order.createdAt).toLocaleString("en-NG"),
    },
  ];
  if (order.customerName)
    lines.push({ type: "center", text: `Customer: ${order.customerName}` });
  lines.push({
    type: "center",
    text: `Staff: ${order.processedBy?.name || "—"}`,
  });
  lines.push({ type: "hr" });

  for (const item of order.items) {
    const qtyLabel = item.variationLabel
      ? `${item.quantity}x pack`
      : item.scaleUnit
        ? `${formatScaleQty(item.quantity, RECEIPT_QTY_STEP)} ${item.scaleUnit}`
        : String(item.quantity);
    const priceLabel = item.variationLabel
      ? `${pdfMoney(item.unitPrice)}/pack`
      : item.scaleUnit
        ? `${pdfMoney(item.unitPrice)}/${item.scaleUnit}`
        : pdfMoney(item.unitPrice);
    const displayName = item.variationLabel
      ? `${item.productName} — ${item.variationLabel}`
      : item.productName;
    for (const nameLine of wrapText(
      `${displayName}${item.discountApplied > 0 ? ` (-${item.discountApplied}%)` : ""}`,
    )) {
      lines.push({ type: "left", text: nameLine, bold: true });
    }
    lines.push({
      type: "row",
      left: `${qtyLabel} x ${priceLabel}`,
      right: pdfMoney(item.subtotal),
    });
  }

  lines.push({ type: "hr" });
  if (order.discountAmount > 0) {
    lines.push({
      type: "row",
      left: "Discount",
      right: `-${pdfMoney(order.discountAmount)}`,
    });
  }
  lines.push(
    {
      type: "row",
      left: "TOTAL",
      right: pdfMoney(order.total),
      bold: true,
      size: 12,
    },
    { type: "row", left: "Payment", right: order.paymentMethod },
  );
  if (order.amountTendered) {
    lines.push({
      type: "row",
      left: "Tendered",
      right: pdfMoney(order.amountTendered),
    });
  }
  if (order.changeGiven && order.changeGiven > 0) {
    lines.push({
      type: "row",
      left: "Change",
      right: pdfMoney(order.changeGiven),
    });
  }

  lines.push(
    { type: "hr" },
    { type: "center", text: copyLabel, bold: true },
    { type: "hr" },
    { type: "center", text: "Software by Calstins Ltd · calstins.com" },
  );

  return lines;
}

// Downloads BOTH the customer copy and the merchant copy as two separate
// PDF files, named so they're unambiguous sitting side by side in a
// downloads folder. A tiny stagger between the two saves avoids some
// browsers' "this site is trying to download multiple files" throttling
// that can silently drop the second one if triggered in the same tick.
//
// `onError` is optional and UI-framework-agnostic on purpose (this file
// has no toast/store access) — callers wire it to their own toast. Before
// this, a failure ANYWHERE in the chain (a busy download permission
// prompt, a jsPDF internal error, anything) failed completely silently:
// no toast, no console-visible feedback, nothing — "does not download"
// with zero way to tell why. Every failure now at least surfaces
// something actionable instead of just... nothing happening.
export function downloadPosReceiptPdf(
  order: POSOrder,
  onError?: (message: string) => void,
) {
  try {
    downloadReceiptPdf(
      buildReceiptPdfLines(order, "CUSTOMER COPY"),
      `Receipt-${order.receiptNumber}-CustomerCopy.pdf`,
    );
  } catch (err) {
    console.error("[posReceipt] Customer copy PDF download failed:", err);
    onError?.(
      "Couldn't generate the customer copy PDF. Try the Print button instead, or check the browser console for details.",
    );
    return; // don't attempt the merchant copy if the first one already failed
  }
  setTimeout(() => {
    try {
      downloadReceiptPdf(
        buildReceiptPdfLines(order, "MERCHANT COPY"),
        `Receipt-${order.receiptNumber}-MerchantCopy.pdf`,
      );
    } catch (err) {
      console.error("[posReceipt] Merchant copy PDF download failed:", err);
      onError?.(
        "Customer copy downloaded, but the merchant copy PDF failed to generate.",
      );
    }
  }, 400);
}

// ── Print via a separate window (see full rationale in the block below) ──────
//
// BUG FIX ("removeChild" crash / unrelated pages getting stuck on
// "Loading…" forever after visiting any page that had printed something):
// this used to print via a hidden <iframe> appended to the live document
// (first document.body, then — in an earlier attempted fix —
// document.documentElement). Both are wrong for the same underlying
// reason: Next.js's App Router hydrates the ENTIRE document via
// `hydrateRoot(document, ...)`, meaning React manages <html>, <head>, AND
// <body> together as one tree, not just <body>. There is no node anywhere
// in the live document that sits outside React's reconciliation — so
// manually appending/removing ANY node into that document, no matter
// where, can corrupt React's own child bookkeeping. That's what was
// throwing "Cannot read properties of null (reading 'removeChild')" from
// inside React's own commitDeletionEffectsOnFiber, taking down the whole
// React tree — which is why a totally unrelated page (the POS order
// detail route) got stuck on "Loading…" forever with no data-fetching bug
// involved at all.
//
// The only way to genuinely avoid this is to not share a document with
// React at all: print into a separate browser window instead of an
// iframe. A new window has its own independent Window/Document object —
// zero DOM nodes in common with the app's document, so there's nothing
// for React to get confused about, regardless of how much of the page
// Next.js's root happens to own.
//
// BUG FIX ("print stops working after frequent clicks") — carried over
// from the iframe implementation:
//   1. `afterprint` is listened for on BOTH the opened window and the top
//      window, since browsers are inconsistent about which one dispatches
//      it for a print triggered on a non-focused window.
//   2. Print jobs are serialized through a small FIFO queue so rapid
//      repeated clicks can't kick off overlapping `print()` calls, which
//      is what made printing appear to "stop entirely" after a few quick
//      clicks in some browsers.
//
// Popup blockers: `window.open()` only reliably succeeds when called
// synchronously in direct response to a user gesture (a click handler),
// which is exactly how this is used — see printBothReceipts below, which
// opens BOTH copies' windows up front, synchronously, before any queuing
// or delay, so the second one can't get blocked for having been opened
// "too late" relative to the click.
function openPrintWindow(html: string): Window | null {
  const win = window.open(
    "",
    "_blank",
    "width=100,height=100,left=-2000,top=-2000",
  );
  if (!win) return null;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return win;
}

const printQueue: Array<{ win: Window; onDone?: () => void }> = [];
let printBusy = false;

function runNextPrintJob() {
  if (printBusy) return;
  const job = printQueue.shift();
  if (!job) return;
  printBusy = true;
  printAndClose(job.win, () => {
    printBusy = false;
    job.onDone?.();
    runNextPrintJob();
  });
}

function printAndClose(win: Window, onDone: () => void) {
  let finished = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    if (finished) return;
    finished = true;
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    try {
      window.removeEventListener("afterprint", cleanup);
    } catch (_) {
      /* ignore */
    }
    try {
      win.removeEventListener("afterprint", cleanup);
    } catch (_) {
      /* ignore */
    }
    try {
      if (!win.closed) win.close();
    } catch (_) {
      /* already closed — ignore */
    }
    onDone();
  };

  setTimeout(() => {
    try {
      if (win.closed) {
        cleanup();
        return;
      }
      win.focus();

      // Inside the desktop app, this popup window has the same
      // posDesktop bridge as the main window (see main.js's
      // overrideBrowserWindowOptions for same-site popups), so print
      // silently — no OS dialog, no manual printer selection. This is
      // what actually fixes the Windows Print dialog you were seeing:
      // window.print() in Electron opens that dialog by default, this
      // bypasses it entirely and prints straight to the configured
      // printer.
      const desktop = (
        win as unknown as {
          posDesktop?: {
            isDesktopApp: boolean;
            silentPrint: () => Promise<{
              success: boolean;
              failureReason?: string;
            }>;
          };
        }
      ).posDesktop;
      if (desktop?.isDesktopApp) {
        desktop
          .silentPrint()
          .then(({ success, failureReason }) => {
            if (!success) {
              console.error(
                `[posReceipt] Silent print failed: ${failureReason}`,
              );
            }
            cleanup();
          })
          .catch((err) => {
            console.error("[posReceipt] Silent print error:", err);
            cleanup();
          });
        return;
      }

      // Normal browser tab (not the desktop app) — same as before:
      // window.print() opens the browser's own print UI, and
      // `afterprint` tells us when that's done.
      window.addEventListener("afterprint", cleanup, { once: true });
      win.addEventListener("afterprint", cleanup, { once: true });
      win.print();
    } catch (_) {
      cleanup();
      return;
    }
    // Hard fallback in case `afterprint` never fires on either target
    fallbackTimer = setTimeout(cleanup, 15_000);
  }, 250);
}

function queuePrint(win: Window, onDone?: () => void) {
  printQueue.push({ win, onDone });
  runNextPrintJob();
}

// ── Print BOTH copies as TWO separate print jobs ────────────────────────
// This used to combine both copies into one continuous document (see
// buildBothReceiptsHtml above) on the theory that a real thermal printer
// produces merchant + customer copy as one unbroken strip with a
// hand-torn "cut here" line. In practice, most Windows/POS thermal
// printer drivers do NOT treat `@page { size: 80mm auto }` as a truly
// unbounded roll — the driver's own configured paper length (whatever is
// set in its Windows printer properties / paper-size list) still forces
// the browser to paginate, and the printer's auto-cutter fires at EVERY
// page break it's given, not just at our dashed line. With one long
// combined document that produced 2–3 cuts in essentially random spots,
// slicing through receipt content instead of just between the two
// copies (this is what was in the photo the user sent).
//
// Two separate print() calls — one per copy — sidesteps this entirely:
// each copy is short enough to fit the printer's own page length, so
// each print job ends exactly where its content ends, and the
// autocutter's per-job cut lands exactly at the end of that receipt.
// This does mean two OS print jobs / two autocutter cuts instead of one,
// but that's the "cut at the end of each receipt" behavior that was
// actually asked for — and it's a much less fragile default than relying
// on every printer driver correctly honoring an unbounded @page height.
export function printBothReceipts(
  order: POSOrder,
  onAllDone?: () => void,
  onError?: (message: string) => void,
) {
  const merchantWin = openPrintWindow(buildReceiptHtml(order, "MERCHANT COPY"));
  const customerWin = openPrintWindow(buildReceiptHtml(order, "CUSTOMER COPY"));

  if (!merchantWin || !customerWin) {
    const message =
      "Print window was blocked by the browser's popup blocker. Please allow popups for this site, or use the Download button instead.";
    console.error(`[posReceipt] ${message}`);
    try {
      merchantWin?.close();
    } catch (_) {
      /* ignore */
    }
    try {
      customerWin?.close();
    } catch (_) {
      /* ignore */
    }
    onError?.(message);
    onAllDone?.();
    return;
  }

  queuePrint(merchantWin, () => queuePrint(customerWin, onAllDone));
}

// ── Print via the local ESC/POS agent (preferred), falling back to the
// browser print pipeline above when the agent isn't reachable ──────────
//
// WHY THIS EXISTS: the two fixes above (fixed @page height, splitting
// into two print jobs) solve the mid-content cut for SHORT-to-MEDIUM
// receipts, but they can't solve it for arbitrarily long ones — Windows
// thermal printer drivers (and often the printer's own firmware buffer)
// have a hard maximum single-page length, and once a real receipt (many
// items) exceeds it, the driver forces a page break regardless of what
// @page CSS asked for, and the autocutter fires there — mid-content
// again. There's no page-height value that fixes this for every
// possible order size, because the order size itself is unbounded.
//
// The only way around that ceiling is to stop going through the OS/GDI
// print pipeline at all. print-agent/ (see that folder's README) is a
// tiny local service that talks to the printer directly over USB using
// raw ESC/POS commands — there's no "page" in that protocol, so a
// 3-item and a 30-item receipt behave identically: the printer just
// keeps feeding until we explicitly send the cut command, once, at the
// true end of the content.
//
// This machine may not have the agent installed/running yet (e.g. right
// after this code ships, before someone's done the one-time setup), so
// this always tries the agent first with a short timeout and silently
// falls back to the existing window.print() path — nothing breaks for
// stores that haven't set up the agent, and everyone gets the length-
// proof path automatically once they have.
const PRINT_AGENT_URL =
  process.env.NEXT_PUBLIC_PRINT_AGENT_URL || "http://127.0.0.1:9142";
const PRINT_AGENT_TIMEOUT_MS = 10000;

async function tryPrintViaAgent(order: POSOrder): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PRINT_AGENT_TIMEOUT_MS);
  try {
    const res = await fetch(`${PRINT_AGENT_URL}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order,
        copies: ["MERCHANT COPY", "CUSTOMER COPY"],
      }),
      signal: controller.signal,
    });
    return res.ok;
  } catch (_) {
    // Agent not running / not installed on this machine / USB error —
    // any of these fall through to the browser-print path below.
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function printBothReceiptsSmart(
  order: POSOrder,
  onAllDone?: () => void,
  onError?: (message: string) => void,
) {
  // Electron is the intended POS printing bridge. Prefer it directly so a
  // successful desktop print request is never followed by a second browser
  // print path. The shared printBothReceipts() function detects the bridge
  // on each print window and calls silentPrint().
  const desktop = (
    window as unknown as {
      posDesktop?: { isDesktopApp?: boolean };
    }
  ).posDesktop;

  if (desktop?.isDesktopApp) {
    printBothReceipts(order, onAllDone, onError);
    return;
  }

  tryPrintViaAgent(order).then((ok) => {
    if (ok) {
      onAllDone?.();
      return;
    }
    // Only use the browser fallback when the local agent request clearly
    // failed. The agent timeout is deliberately generous because an aborted
    // HTTP request can otherwise race with a print that the agent already
    // accepted, producing duplicate receipts.
    printBothReceipts(order, onAllDone, onError);
  });
}
