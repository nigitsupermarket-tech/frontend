"use client";

// frontend/src/app/(admin)/admin/pos/orders/page.tsx
// POS orders history — search, filter, void, view receipt

import { useState, useEffect, useCallback } from "react";
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
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
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
}

interface POSOrder {
  id: string;
  posOrderNumber: string;
  receiptNumber: string;
  status: "COMPLETED" | "VOIDED" | "REFUNDED";
  paymentMethod: "CASH" | "CARD" | "TRANSFER" | "SPLIT";
  subtotal: number;
  discountAmount: number;
  total: number;
  amountTendered?: number;
  changeGiven?: number;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  completedAt?: string;
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

const PAYMENT_ICONS = {
  CASH: <Banknote className="w-3.5 h-3.5" />,
  CARD: <CreditCard className="w-3.5 h-3.5" />,
  TRANSFER: <ArrowRightLeft className="w-3.5 h-3.5" />,
  SPLIT: <TrendingUp className="w-3.5 h-3.5" />,
};

const PAYMENT_COLORS = {
  CASH: "bg-green-100 text-green-700",
  CARD: "bg-blue-100 text-blue-700",
  TRANSFER: "bg-purple-100 text-purple-700",
  SPLIT: "bg-amber-100 text-amber-700",
};

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
  const [dateFilter, setDateFilter] = useState(() => {
    return new Date().toISOString().split("T")[0]; // today
  });
  const [page, setPage] = useState(1);

  const [selectedOrder, setSelectedOrder] = useState<POSOrder | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
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
      setShowDetail(false);
      setVoidReason("");
      fetchOrders();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setVoiding(false);
    }
  };

  const printReceipt = (order: POSOrder) => {
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`
      <html>
      <head>
        <title>Receipt ${order.receiptNumber}</title>
        <style>
          body { font-family: monospace; font-size: 12px; max-width: 300px; margin: 0 auto; padding: 10px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .large { font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="center bold large">NigitTriple Supermarket</div>
        <div class="center">Port Harcourt, Rivers State</div>
        <div class="divider"></div>
        <div class="center">Receipt: ${order.receiptNumber}</div>
        <div class="center">${new Date(order.createdAt).toLocaleString("en-NG")}</div>
        ${order.customerName ? `<div class="center">Customer: ${order.customerName}</div>` : ""}
        <div class="center">Staff: ${order.processedBy?.name || "—"}</div>
        <div class="divider"></div>
        ${order.items
          .map(
            (item) => `
          <div>${item.productName}</div>
          <div class="row">
            <span>${item.quantity} x ₦${item.unitPrice.toLocaleString()}${item.discountApplied > 0 ? ` (-${item.discountApplied}%)` : ""}</span>
            <span>₦${item.subtotal.toLocaleString()}</span>
          </div>
        `,
          )
          .join("")}
        <div class="divider"></div>
        <div class="row"><span>Subtotal</span><span>₦${order.subtotal.toLocaleString()}</span></div>
        ${order.discountAmount > 0 ? `<div class="row"><span>Discount</span><span>-₦${order.discountAmount.toLocaleString()}</span></div>` : ""}
        <div class="row bold large"><span>TOTAL</span><span>₦${order.total.toLocaleString()}</span></div>
        <div class="row"><span>Payment: ${order.paymentMethod}</span></div>
        ${order.amountTendered ? `<div class="row"><span>Tendered</span><span>₦${order.amountTendered.toLocaleString()}</span></div>` : ""}
        ${order.changeGiven && order.changeGiven > 0 ? `<div class="row bold"><span>CHANGE</span><span>₦${order.changeGiven.toLocaleString()}</span></div>` : ""}
        <div class="divider"></div>
        <div class="center">Thank you for shopping!</div>
        <div class="center">Goods sold are not returnable</div>
        <div class="center">without receipt within 7 days</div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
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
            <Monitor className="w-4 h-4" />
            Open POS
          </Link>
          <button
            onClick={fetchOrders}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Day stats */}
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

      {/* Orders table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-green-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No POS orders found for the selected filters.
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
                            PAYMENT_COLORS[order.paymentMethod] ||
                              "bg-gray-100 text-gray-700",
                          )}
                        >
                          {PAYMENT_ICONS[order.paymentMethod]}
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
                                : "bg-gray-100 text-gray-700",
                          )}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetail(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => printReceipt(order)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title="Print receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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

      {/* Order Detail Modal */}
      {showDetail && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900">
                  {selectedOrder.posOrderNumber}
                </h3>
                <p className="text-xs text-gray-500 font-mono">
                  Receipt: {selectedOrder.receiptNumber}
                </p>
              </div>
              <button onClick={() => setShowDetail(false)}>
                <XCircle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-500">Date/Time</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.createdAt).toLocaleString("en-NG")}
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
                    <p className="font-medium">{selectedOrder.customerName}</p>
                    <p className="text-xs text-gray-400">
                      {selectedOrder.customerPhone}
                    </p>
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
                  {selectedOrder.items.map((item, i) => (
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
                          {item.quantity} × {formatPrice(item.unitPrice)}
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
                <div className="flex justify-between font-extrabold text-gray-900 text-base pt-1">
                  <span>Total</span>
                  <span>{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Void option for completed orders */}
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
                    onClick={() => handleVoid(selectedOrder.id)}
                    disabled={voiding || !voidReason.trim()}
                    className="w-full py-2 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {voiding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Void Order
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="border-t p-4 flex gap-3">
              <button
                onClick={() => printReceipt(selectedOrder)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-sm"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
              <button
                onClick={() => setShowDetail(false)}
                className="flex-1 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
