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
} from "./receiptPdf";

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
export function buildReceiptHtml(
  order: POSOrder,
  copyLabel: "CUSTOMER COPY" | "MERCHANT COPY",
): string {
  const itemsHtml = order.items
    .map((item) => {
      const qtyLabel = item.scaleUnit
        ? `${item.quantity % 1 === 0 ? item.quantity.toFixed(0) : item.quantity.toFixed(2)} ${item.scaleUnit}`
        : String(item.quantity);
      const priceLabel = item.scaleUnit
        ? `&#8358;${item.unitPrice.toLocaleString()}/${item.scaleUnit}`
        : `&#8358;${item.unitPrice.toLocaleString()}`;
      return `
    <tr>
      <td style="padding:1mm 0;"><strong>${item.productName}${item.discountApplied > 0 ? ` (-${item.discountApplied}%)` : ""}</strong></td>
      <td style="text-align:right;white-space:nowrap;"><strong>${qtyLabel}&times;${priceLabel}</strong></td>
      <td style="text-align:right;white-space:nowrap;"><strong>&#8358;${item.subtotal.toLocaleString()}</strong></td>
    </tr>
  `;
    })
    .join("");

  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <style>
      /* size: 80mm 297mm — NOT "80mm auto". See printOnlineInvoice.ts for
         the full explanation: "auto" height can hang Chrome's print-preview
         pagination on fixed-page destinations like Print to PDF, even
         though it works fine on a real thermal printer's roll-paper
         driver. A generously tall fixed height works on both. */
      @page { size: 80mm 297mm; margin: 2mm 0; }
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
    </style>
  </head><body>
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
    const qtyLabel = item.scaleUnit
      ? `${item.quantity % 1 === 0 ? item.quantity.toFixed(0) : item.quantity.toFixed(2)} ${item.scaleUnit}`
      : String(item.quantity);
    const priceLabel = item.scaleUnit
      ? `${pdfMoney(item.unitPrice)}/${item.scaleUnit}`
      : pdfMoney(item.unitPrice);
    for (const nameLine of wrapText(
      `${item.productName}${item.discountApplied > 0 ? ` (-${item.discountApplied}%)` : ""}`,
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
export function downloadPosReceiptPdf(order: POSOrder) {
  downloadReceiptPdf(
    buildReceiptPdfLines(order, "CUSTOMER COPY"),
    `Receipt-${order.receiptNumber}-CustomerCopy.pdf`,
  );
  setTimeout(() => {
    downloadReceiptPdf(
      buildReceiptPdfLines(order, "MERCHANT COPY"),
      `Receipt-${order.receiptNumber}-MerchantCopy.pdf`,
    );
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
      // Listen on BOTH the top window and the print window — different
      // browsers dispatch `afterprint` to different targets. First one to
      // fire wins.
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

// ── Print BOTH copies: customer copy first, then merchant (in-house) copy ────
// Both windows are opened synchronously, right here, in direct response to
// the click that called this — see the popup-blocker note above for why
// that matters. Only the actual print()/close() sequencing is deferred.
export function printBothReceipts(order: POSOrder, onAllDone?: () => void) {
  const customerWin = openPrintWindow(buildReceiptHtml(order, "CUSTOMER COPY"));
  const merchantWin = openPrintWindow(buildReceiptHtml(order, "MERCHANT COPY"));
  if (!customerWin || !merchantWin) {
    console.error(
      "[posReceipt] Print windows were blocked by the browser's popup blocker. " +
        "Please allow popups for this site, or use the Download button instead.",
    );
    customerWin?.close();
    merchantWin?.close();
    onAllDone?.();
    return;
  }
  queuePrint(customerWin, () => {
    // Small delay so the OS print spooler/dialog has fully cleared
    setTimeout(() => {
      queuePrint(merchantWin, onAllDone);
    }, 600);
  });
}
