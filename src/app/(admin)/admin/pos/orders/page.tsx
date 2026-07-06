"use client";

// frontend/src/app/(admin)/admin/pos/orders/page.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Eye,
  XCircle,
  Printer,
  Loader2,
  RefreshCw,
  TrendingUp,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Monitor,
} from "lucide-react";
import { apiGet, apiPut, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatPrice, cn } from "@/lib/utils";
import Link from "next/link";

interface POSOrderItem {
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

interface POSOrder {
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

interface DayStats {
  totalOrders: number;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
}

const PM_COLORS: Record<string, string> = {
  CASH: "bg-green-100 text-green-700",
  CARD: "bg-blue-100 text-blue-700",
  TRANSFER: "bg-purple-100 text-purple-700",
  SPLIT: "bg-amber-100 text-amber-700",
};

// ── Receipt HTML builder ──────────────────────────────────────────────────────
// `copyLabel`: shown at the bottom of the receipt so cashiers can tell the
// customer's copy apart from the in-house (merchant) copy at a glance.
function buildReceiptHtml(
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
      @page { size: 80mm auto; margin: 2mm 0; }
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

// ── Print via hidden iframe (no popup blocker issues) ────────────────────────
// IMPORTANT: We load the receipt via a Blob URL (`iframe.src`) rather than
// `document.write()`. With `document.write()`, the iframe's `load` event has
// already fired (for the initial about:blank document) by the time we attach
// `iframe.onload` — this works "by luck" on the very first call of a page
// session, but on subsequent calls the browser doesn't re-fire `load`, so the
// print is silently never triggered. A Blob URL assigned to `src` reliably
// fires `load` every single time.
//
// BUG FIX ("print stops working after frequent clicks"): two things were
// happening together:
//   1. `afterprint` was only listened for on the iframe's OWN window
//      (`iframe.contentWindow`). Several browsers only ever dispatch
//      `afterprint` on the TOP-level window when printing was triggered
//      from an embedded iframe, so that listener silently never fired.
//      Cleanup then only ever ran via the 60s hard-fallback timer, so
//      leftover iframes/object URLs piled up under rapid clicking.
//   2. Nothing serialized overlapping print calls — clicking Print several
//      times quickly could kick off several `window.print()` calls before
//      the previous print dialog had closed, which is what made printing
//      appear to "stop entirely" after a few rapid clicks (the browser just
//      stops responding to further print() calls while one is already
//      pending in some engines).
//
// Fix: a small FIFO queue processes one print job at a time, and cleanup
// listens on BOTH the top window and the iframe window (whichever fires
// first wins), with the fallback timer properly cleared once done.
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
  // Remove any leftover frame from previous prints
  try {
    const old = document.getElementById("pos-print-frame");
    if (old && old.parentNode) old.parentNode.removeChild(old);
  } catch (_) {
    /* ignore */
  }

  const blob = new Blob([html], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);

  const iframe = document.createElement("iframe");
  iframe.id = "pos-print-frame";
  iframe.setAttribute(
    "style",
    "position:fixed;top:-9999px;left:-9999px;width:80mm;height:200mm;border:none;visibility:hidden;",
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
    try {
      URL.revokeObjectURL(blobUrl);
    } catch (_) {
      /* ignore */
    }
    onDone();
  };

  iframe.onload = () => {
    setTimeout(() => {
      try {
        const win = iframe.contentWindow;
        if (!win) {
          cleanup();
          return;
        }
        win.focus();
        // Listen on BOTH the top window and the iframe's window — different
        // browsers dispatch `afterprint` to different targets when the
        // print was triggered from an iframe. First one to fire wins.
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
  };

  iframe.src = blobUrl;
  document.body.appendChild(iframe);
}

// ── Print BOTH copies: customer copy first, then merchant (in-house) copy ────
// The browser print dialog is modal, so the second print is only triggered
// once the first dialog has been closed (printed/cancelled).
function printBothReceipts(order: POSOrder, onAllDone?: () => void) {
  printViaIframe(buildReceiptHtml(order, "CUSTOMER COPY"), () => {
    // Small delay so the OS print spooler/dialog has fully cleared
    setTimeout(() => {
      printViaIframe(buildReceiptHtml(order, "MERCHANT COPY"), onAllDone);
    }, 600);
  });
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function POSOrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<POSOrder[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DayStats | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<POSOrder | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Guards against spam-clicking Print: tracks which order is currently
  // printing so its button can be disabled until the job finishes.
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);

  const handlePrint = (order: POSOrder) => {
    if (printingOrderId) return; // already printing something — ignore extra clicks
    setPrintingOrderId(order.id);
    printBothReceipts(order, () => setPrintingOrderId(null));
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (dateFilter) {
        params.set("startDate", dateFilter);
        params.set("endDate", dateFilter);
      }

      const [ordersRes, statsRes] = await Promise.all([
        apiGet<any>(`/pos/orders?${params}`),
        apiGet<any>(`/pos/stats?date=${dateFilter}`),
      ]);

      setOrders(ordersRes.data.orders || []);
      setPagination(
        ordersRes.data.pagination || { total: 0, page: 1, totalPages: 1 },
      );
      setStats(statsRes.data || null);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, dateFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleVoid = async (orderId: string) => {
    if (!voidReason.trim()) {
      toast("Please enter a reason for voiding", "error");
      return;
    }
    setVoiding(true);
    try {
      await apiPut(`/pos/orders/${orderId}/void`, { reason: voidReason });
      toast("Order voided and stock restored", "success");
      setSelectedOrder(null);
      setVoidReason("");
      fetchOrders();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setVoiding(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">POS Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">In-store sales history</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/pos"
            className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold rounded-lg text-sm"
          >
            <Monitor className="w-4 h-4" /> Open POS
          </Link>
          <button
            type="button"
            onClick={fetchOrders}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {
              label: "Total Orders",
              value: stats.totalOrders,
              color: "text-gray-900",
            },
            {
              label: "Total Sales",
              value: formatPrice(stats.totalSales),
              color: "text-green-700",
            },
            {
              label: "Cash",
              value: formatPrice(stats.cashSales),
              color: "text-emerald-700",
            },
            {
              label: "Card",
              value: formatPrice(stats.cardSales),
              color: "text-blue-700",
            },
            {
              label: "Transfer",
              value: formatPrice(stats.transferSales),
              color: "text-purple-700",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-white border border-gray-200 rounded-lg p-3"
            >
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search order #, customer, receipt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 text-sm focus:outline-none focus:border-green-500 rounded"
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 rounded"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 rounded bg-white"
        >
          <option value="">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="VOIDED">Voided</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-green-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No POS orders found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {[
                      "Order #",
                      "Time",
                      "Customer",
                      "Items",
                      "Payment",
                      "Total",
                      "Staff",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800 whitespace-nowrap">
                        {order.posOrderNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleTimeString("en-NG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {order.customerName ? (
                          <div>
                            <p className="font-medium text-gray-900 text-xs">
                              {order.customerName}
                            </p>
                            {order.customerPhone && (
                              <p className="text-gray-400 text-xs">
                                {order.customerPhone}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Walk-in</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {order.items.length} item
                        {order.items.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
                            PM_COLORS[order.paymentMethod] ||
                              "bg-gray-100 text-gray-700",
                          )}
                        >
                          {order.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {order.processedBy?.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-semibold",
                            order.status === "COMPLETED"
                              ? "bg-green-100 text-green-700"
                              : order.status === "VOIDED"
                                ? "bg-red-100 text-red-700"
                                : order.status === "SUSPENDED"
                                  ? "bg-blue-100 text-blue-700"
                                  : order.status === "OPEN"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-gray-100 text-gray-700",
                          )}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrint(order)}
                            disabled={printingOrderId === order.id}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Print receipt (customer + merchant copy)"
                          >
                            {printingOrderId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Printer className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 bg-gray-50">
                <span className="text-xs text-gray-500">
                  {pagination.total} total orders
                </span>
                <div className="flex gap-2">
                  {Array.from(
                    { length: Math.min(pagination.totalPages, 8) },
                    (_, i) => i + 1,
                  ).map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "w-8 h-8 text-xs font-medium rounded border",
                        p === page
                          ? "bg-green-600 border-green-600 text-white"
                          : "border-gray-300 text-gray-700 hover:border-green-500",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Detail Modal via portal */}
      {mounted &&
        selectedOrder &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
            style={{ zIndex: 100000 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedOrder(null);
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <h3 className="font-bold text-gray-900">
                    {selectedOrder.posOrderNumber}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Receipt: {selectedOrder.receiptNumber || "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 text-gray-400 hover:text-gray-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Date/Time</p>
                    <p className="font-medium">
                      {new Date(selectedOrder.createdAt).toLocaleString(
                        "en-NG",
                      )}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Staff</p>
                    <p className="font-medium">
                      {selectedOrder.processedBy?.name}
                    </p>
                  </div>
                  {selectedOrder.customerName && (
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-500">Customer</p>
                      <p className="font-medium">
                        {selectedOrder.customerName}
                      </p>
                      {selectedOrder.customerPhone && (
                        <p className="text-xs text-gray-400">
                          {selectedOrder.customerPhone}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Payment</p>
                    <p className="font-medium">{selectedOrder.paymentMethod}</p>
                    {selectedOrder.amountTendered !== undefined && (
                      <p className="text-xs text-gray-400">
                        Tendered: {formatPrice(selectedOrder.amountTendered)}
                      </p>
                    )}
                    {selectedOrder.changeGiven !== undefined &&
                      selectedOrder.changeGiven > 0 && (
                        <p className="text-xs text-gray-400">
                          Change: {formatPrice(selectedOrder.changeGiven)}
                        </p>
                      )}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Items
                  </h4>
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded">
                    {(selectedOrder.items || []).map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.productName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {item.productSku}
                            {item.netWeight && ` · ${item.netWeight}`}
                            {item.discountApplied > 0 &&
                              ` · -${item.discountApplied}% disc.`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatPrice(item.subtotal)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {item.scaleUnit
                              ? `${item.quantity % 1 === 0 ? item.quantity.toFixed(0) : item.quantity.toFixed(2)} ${item.scaleUnit} × ${formatPrice(item.unitPrice)}/${item.scaleUnit}`
                              : `${item.quantity} × ${formatPrice(item.unitPrice)}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Discount</span>
                      <span>-{formatPrice(selectedOrder.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-gray-900 text-base pt-1 border-t">
                    <span>Total</span>
                    <span>{formatPrice(selectedOrder.total)}</span>
                  </div>
                </div>

                {/* Void */}
                {selectedOrder.status === "COMPLETED" && (
                  <div className="border border-red-200 rounded-lg p-3 bg-red-50">
                    <p className="text-xs font-semibold text-red-700 mb-2">
                      Void this order (stock will be restored)
                    </p>
                    <input
                      type="text"
                      placeholder="Reason for voiding..."
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      className="w-full border border-red-200 px-3 py-2 text-sm rounded focus:outline-none focus:border-red-400 mb-2"
                    />
                    <button
                      type="button"
                      onClick={() => handleVoid(selectedOrder.id)}
                      disabled={voiding || !voidReason.trim()}
                      className="w-full py-2 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {voiding ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" /> Void Order
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t p-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => handlePrint(selectedOrder)}
                  disabled={printingOrderId === selectedOrder.id}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Prints the customer copy, then the merchant (in-house) copy"
                >
                  {printingOrderId === selectedOrder.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}{" "}
                  Print Receipts (2)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
