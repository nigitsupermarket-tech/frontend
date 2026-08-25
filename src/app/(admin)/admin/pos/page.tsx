"use client";

// frontend/src/app/(admin)/admin/pos/orders/page.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Printer,
  Download,
  Loader2,
  RefreshCw,
  TrendingUp,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Monitor,
  X,
} from "lucide-react";
import { apiGet, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatPrice, cn } from "@/lib/utils";
import {
  type POSOrder,
  printBothReceipts,
  downloadPosReceiptPdf,
  buildBothReceiptsHtml,
} from "@/lib/posReceipt";

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
  // Guards against spam-clicking Print: tracks which order is currently
  // printing so its button can be disabled until the job finishes.
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  // Preview-before-print modal — same idea as the live checkout page's
  // "Payment Successful" screen (you see the actual receipt before
  // anything gets sent to a printer), previously missing here entirely:
  // clicking Print on this list went straight to the popup-window print
  // flow with no way to see what was about to print first.
  const [previewOrder, setPreviewOrder] = useState<POSOrder | null>(null);

  const handlePrint = (order: POSOrder) => {
    if (printingOrderId) return; // already printing something — ignore extra clicks
    setPrintingOrderId(order.id);
    printBothReceipts(
      order,
      () => setPrintingOrderId(null),
      (message) => toast(message, "error"),
    );
  };

  const handleDownload = (order: POSOrder) => {
    downloadPosReceiptPdf(order, (message) => toast(message, "error"));
  };

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
                            onClick={() => setPreviewOrder(order)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title="Preview receipt before printing"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownload(order)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title="Download both copies as PDF (customer + merchant)"
                          >
                            <Download className="w-4 h-4" />
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

      {/* ── Print preview modal ── same idea as the live checkout page's
          "Payment Successful" screen: see the actual receipt before
          anything gets sent to a printer, instead of Print going straight
          to the popup-window flow with no confirmation. The iframe uses
          the EXACT same buildBothReceiptsHtml() the real print job uses,
          so this is a true "what you see is what prints" preview, not a
          separate re-implementation that could drift out of sync with it.
          Scrollable for a long order — no pagination here either, same as
          the actual print output. */}
      {previewOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Receipt Preview</h3>
                <p className="text-xs text-gray-400">
                  {previewOrder.receiptNumber} — merchant + customer copy
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOrder(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50 p-3">
              <iframe
                title="Receipt preview"
                srcDoc={buildBothReceiptsHtml(previewOrder)}
                className="w-full bg-white rounded-lg border border-gray-200"
                style={{ height: "60vh" }}
              />
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleDownload(previewOrder)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button
                type="button"
                disabled={printingOrderId === previewOrder.id}
                onClick={() => {
                  const order = previewOrder;
                  handlePrint(order);
                  setPreviewOrder(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {printingOrderId === previewOrder.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
