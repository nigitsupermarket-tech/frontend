// frontend/src/lib/printOnlineInvoice.ts
//
// Prints an online order as an 80mm receipt — same paper size as the POS
// printer (see lib/posReceipt.ts's buildReceiptHtml/printBothReceipts),
// with an "ONLINE ORDER" badge so the two are never confused at a glance.
//
// The print engine here mirrors the queued print-window implementation
// from lib/posReceipt.ts: prints into a separate browser window (never an
// iframe in the live document — see the full rationale inline below),
// serialized through a small FIFO queue since a plain window.print() can
// silently stop firing on rapid repeated clicks otherwise, with cleanup
// listening on both the top window and the print window (browsers are
// inconsistent about which one dispatches `afterprint`).
import type { Order } from "@/types";
import type { SiteSettings } from "@/types";
import {
  type ReceiptLine,
  downloadReceiptPdf,
  wrapText,
  money as pdfMoney,
} from "./receiptPdf";

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  READY_FOR_PICKUP: "Ready for Pickup",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

function esc(v: unknown): string {
  return String(v ?? "").replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string,
  );
}

function money(n: number): string {
  return `&#8358;${Math.round(n).toLocaleString()}`;
}

export function buildOnlineInvoiceHtml(
  order: Order,
  settings?: Partial<SiteSettings>,
): string {
  const addr = (order.shippingAddress as any) || {};
  const itemsHtml = (order.items || [])
    .map(
      (item: any) => `
    <div style="display:flex;justify-content:space-between;margin-bottom:1mm;">
      <span>${esc(item.product?.name || "Item")} x${item.quantity}</span>
      <span>${money(item.price * item.quantity)}</span>
    </div>`,
    )
    .join("");

  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <style>
      /* size: 80mm 297mm — NOT "80mm auto". A real thermal printer's
         continuous-roll driver handles "auto" height fine, but Chrome's
         "Print to PDF"/"Save as PDF" destination is a fixed-page renderer
         with no roll-paper concept — asking it to paginate an undefined
         height can hang the print-preview generator indefinitely ("Loading
         preview…" that never resolves). A generously tall FIXED height
         works on both: real thermal printers still cut at the natural end
         of content, and Print-to-PDF can paginate normally. */
      @page { size: 80mm 297mm; margin: 0; }
      * { box-sizing: border-box; }
      body { font-family: 'Courier New', Courier, monospace; font-size: 12px;
             width: 72mm; margin: 0 auto; padding: 4mm 2mm; line-height: 1.5;
             color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .c { text-align: center; }
      .b { font-weight: 900; }
      hr { border: none; border-top: 1px dashed #000; margin: 2mm 0; }
      .row { display: flex; justify-content: space-between; }
      .online-badge { display: inline-block; border: 1px solid #000; padding: 1mm 3mm;
                      font-weight: 900; letter-spacing: 0.1em; margin: 1mm 0; }
      .total { font-size: 14px; font-weight: 900; }
    </style>
  </head><body>
    <div class="c">
      <div class="b" style="font-size:14px;">${esc(settings?.siteName || "NigitTriple Supermarket")}</div>
      ${settings?.address ? `<div>${esc(settings.address)}</div>` : ""}
      ${settings?.phone ? `<div>Tel: ${esc(settings.phone)}</div>` : ""}
      <hr/>
      <span class="online-badge">ONLINE ORDER</span>
      <div style="margin-top:1mm;">Order #${esc(order.orderNumber)}</div>
      <div>${esc(new Date(order.createdAt).toLocaleString("en-NG"))}</div>
      <div>Customer: ${esc(order.customerName)}</div>
      ${order.customerPhone ? `<div>Phone: ${esc(order.customerPhone)}</div>` : ""}
      <hr/>
    </div>

    ${itemsHtml}

    <hr/>
    <div class="row"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
    ${order.discountAmount > 0 ? `<div class="row"><span>Discount</span><span>-${money(order.discountAmount)}</span></div>` : ""}
    <div class="row"><span>Shipping</span><span>${money(order.shippingCost)}</span></div>
    <hr/>
    <div class="row total"><span>TOTAL</span><span>${money(order.total)}</span></div>
    <hr/>

    <div>Payment: ${order.paymentMethod === "BANK_TRANSFER" ? "Bank Transfer" : esc(order.paymentMethod)} (${esc(order.paymentStatus)})</div>
    <div>Status: ${esc(ORDER_STATUS_LABELS[order.status] || order.status)}</div>

    ${
      !order.isPickup
        ? `<hr/>
    <div class="b">Ship to:</div>
    <div>${esc(addr.fullName || `${addr.firstName || ""} ${addr.lastName || ""}`.trim())}</div>
    <div>${esc(addr.address || addr.addressLine1)}</div>
    <div>${esc(addr.city)}, ${esc(addr.state)}</div>`
        : ""
    }

    <hr/>
    <div class="c">Thank you for shopping with us!</div>
  </body></html>`;
}

// ── Print via a separate window ───────────────────────────────────────────
// This used to print via a hidden <iframe> appended to the live document.
// That's wrong regardless of whether it's appended to document.body or
// document.documentElement: Next.js's App Router hydrates the ENTIRE
// document via `hydrateRoot(document, ...)`, meaning React manages <html>,
// <head>, AND <body> together as one tree. There is no node anywhere in
// the live document that sits outside React's reconciliation, so manually
// appending/removing ANY node there can corrupt React's own child
// bookkeeping — which is what was throwing "Cannot read properties of
// null (reading 'removeChild')" from inside React's own
// commitDeletionEffectsOnFiber, taking down the whole React tree. That's
// how a totally unrelated page could end up stuck on "Loading…" forever
// after visiting any page that had printed something, with no
// data-fetching bug involved at all.
//
// The only way to genuinely avoid this is to not share a document with
// React at all: print into a separate browser window instead of an
// iframe. A new window has its own independent Window/Document object —
// zero DOM nodes in common with the app's document.
//
// BUG FIX ("print stops working after frequent clicks") — carried over
// from the iframe implementation: `afterprint` is listened for on BOTH the
// opened window and the top window (browsers are inconsistent about which
// one dispatches it), and print jobs are serialized through a small FIFO
// queue so rapid repeated clicks can't kick off overlapping print() calls.
//
// Popup blockers: window.open() only reliably succeeds when called
// synchronously in direct response to a user gesture — exactly how
// printOnlineOrderInvoice below uses it (called straight from the button's
// onClick, no await/setTimeout before the window.open() call).
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
      window.addEventListener("afterprint", cleanup, { once: true });
      win.addEventListener("afterprint", cleanup, { once: true });
      win.print();
    } catch (_) {
      cleanup();
      return;
    }
    fallbackTimer = setTimeout(cleanup, 15_000);
  }, 250);
}

export function printOnlineOrderInvoice(
  order: Order,
  settings?: Partial<SiteSettings>,
  onDone?: () => void,
) {
  const win = openPrintWindow(buildOnlineInvoiceHtml(order, settings));
  if (!win) {
    console.error(
      "[printOnlineInvoice] Print window was blocked by the browser's popup blocker. " +
        "Please allow popups for this site, or use the Download button instead.",
    );
    onDone?.();
    return;
  }
  printQueue.push({ win, onDone });
  runNextPrintJob();
}

// ── Download as PDF — same content as buildOnlineInvoiceHtml above, but as
// an actual file download via jsPDF. No iframe, no window.print(), no print
// dialog at all — this is the fallback for whenever the browser's own
// print-preview pipeline is the thing that's broken (see receiptPdf.ts). ──
export function buildOnlineInvoicePdfLines(
  order: Order,
  settings?: Partial<SiteSettings>,
): ReceiptLine[] {
  const addr = (order.shippingAddress as any) || {};

  // Long header text (a full street address especially) doesn't fit on one
  // 80mm-wide centered line — it just overflows equally off both edges of
  // the page instead of wrapping, which is what was clipping the header
  // ("...ozgomero estate ), Opposite FCMB Bank, Port Harcour..." — missing
  // characters at BOTH ends). Wrap every header line the same way item
  // names already are.
  const pushCentered = (
    lines: ReceiptLine[],
    text: string,
    opts: { bold?: boolean; size?: number } = {},
  ) => {
    for (const line of wrapText(text, 30)) {
      lines.push({ type: "center", text: line, ...opts });
    }
  };

  const lines: ReceiptLine[] = [];
  pushCentered(lines, settings?.siteName || "NigitTriple Supermarket", {
    bold: true,
    size: 11,
  });
  if (settings?.address) pushCentered(lines, settings.address);
  if (settings?.phone) pushCentered(lines, `Tel: ${settings.phone}`);
  lines.push(
    { type: "hr" },
    { type: "center", text: "ONLINE ORDER", bold: true },
    { type: "center", text: `Order #${order.orderNumber}` },
    { type: "center", text: new Date(order.createdAt).toLocaleString("en-NG") },
  );
  pushCentered(lines, `Customer: ${order.customerName}`);
  if (order.customerPhone)
    lines.push({ type: "center", text: `Phone: ${order.customerPhone}` });
  lines.push({ type: "hr" });

  for (const item of order.items || ([] as any[])) {
    const name = (item as any).product?.name || "Item";
    for (const nameLine of wrapText(name)) {
      lines.push({ type: "left", text: nameLine, bold: true });
    }
    lines.push({
      type: "row",
      left: `${item.quantity} x ${pdfMoney(item.price)}`,
      right: pdfMoney(item.price * item.quantity),
    });
  }

  lines.push(
    { type: "hr" },
    { type: "row", left: "Subtotal", right: pdfMoney(order.subtotal) },
  );
  if (order.discountAmount > 0) {
    lines.push({
      type: "row",
      left: "Discount",
      right: `-${pdfMoney(order.discountAmount)}`,
    });
  }
  lines.push(
    { type: "row", left: "Shipping", right: pdfMoney(order.shippingCost) },
    { type: "hr" },
    {
      type: "row",
      left: "TOTAL",
      right: pdfMoney(order.total),
      bold: true,
      size: 11,
    },
    { type: "hr" },
    {
      type: "left",
      text: `Payment: ${order.paymentMethod === "BANK_TRANSFER" ? "Bank Transfer" : order.paymentMethod} (${order.paymentStatus})`,
    },
    {
      type: "left",
      text: `Status: ${ORDER_STATUS_LABELS[order.status] || order.status}`,
    },
  );

  if (!order.isPickup) {
    const name =
      addr.fullName || `${addr.firstName || ""} ${addr.lastName || ""}`.trim();
    lines.push(
      { type: "hr" },
      { type: "left", text: "Ship to:", bold: true },
      { type: "left", text: name },
      { type: "left", text: addr.address || addr.addressLine1 || "" },
      { type: "left", text: `${addr.city || ""}, ${addr.state || ""}` },
    );
  }

  lines.push(
    { type: "hr" },
    { type: "center", text: "Thank you for shopping with us!" },
    { type: "hr" },
    { type: "center", text: "Software by Calstins Ltd · calstins.com" },
  );

  return lines;
}

export function downloadOnlineInvoicePdf(
  order: Order,
  settings?: Partial<SiteSettings>,
) {
  downloadReceiptPdf(
    buildOnlineInvoicePdfLines(order, settings),
    `Online-Invoice-${order.orderNumber}.pdf`,
  );
}
