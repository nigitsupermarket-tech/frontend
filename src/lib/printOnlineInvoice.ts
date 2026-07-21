// frontend/src/lib/printOnlineInvoice.ts
//
// Prints an online order as an 80mm receipt — same paper size as the POS
// printer (see admin/pos/orders/page.tsx's buildReceiptHtml/printViaIframe),
// with an "ONLINE ORDER" badge so the two are never confused at a glance.
//
// The print engine here mirrors the queued-iframe implementation from the
// POS orders list: a plain iframe + window.print() can silently stop firing
// on rapid repeated clicks unless print jobs are serialized through a FIFO
// queue and cleanup listens on both the top window and the iframe's own
// window (browsers are inconsistent about which one dispatches `afterprint`
// when printing was triggered from inside an iframe). See that file's
// comments for the full history, plus the srcdoc print-preview hang fix
// documented inline below.
import type { Order } from "@/types";
import type { SiteSettings } from "@/types";

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

// ── Queued iframe print engine (identical pattern to the POS orders list) ──
const printQueue: Array<{ html: string; onDone?: () => void }> = [];
let printBusy = false;

function runNextPrintJob() {
  if (printBusy) return;
  const job = printQueue.shift();
  if (!job) return;
  printBusy = true;
  printViaIframeInternal(job.html, () => {
    printBusy = false;
    job.onDone?.();
    runNextPrintJob();
  });
}

function printViaIframe(html: string, onDone?: () => void) {
  printQueue.push({ html, onDone });
  runNextPrintJob();
}

function printViaIframeInternal(html: string, onDone: () => void) {
  try {
    const old = document.getElementById("online-order-print-frame");
    if (old && old.parentNode) old.parentNode.removeChild(old);
  } catch (_) {
    /* ignore */
  }

  const iframe = document.createElement("iframe");
  iframe.id = "online-order-print-frame";
  iframe.setAttribute(
    "style",
    "position:fixed;top:-9999px;left:-9999px;width:80mm;height:200mm;border:none;",
  );

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
      iframe.contentWindow?.removeEventListener("afterprint", cleanup);
    } catch (_) {
      /* ignore */
    }
    try {
      if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
    } catch (_) {
      /* already removed — ignore */
    }
    onDone();
  };

  let printed = false;
  const doPrint = () => {
    if (printed) return; // guard against onload firing in addition to the fallback timer
    printed = true;
    try {
      const win = iframe.contentWindow;
      if (!win) {
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
  };

  iframe.onload = () => setTimeout(doPrint, 50);
  iframe.srcdoc = html;
  document.body.appendChild(iframe);

  // Fallback in case `onload` never fires for some reason (some older
  // browsers are inconsistent about firing load for srcdoc content).
  fallbackTimer = setTimeout(doPrint, 1000);
}

export function printOnlineOrderInvoice(
  order: Order,
  settings?: Partial<SiteSettings>,
  onDone?: () => void,
) {
  printViaIframe(buildOnlineInvoiceHtml(order, settings), onDone);
}
