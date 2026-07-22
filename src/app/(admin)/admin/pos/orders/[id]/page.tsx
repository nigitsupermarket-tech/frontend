"use client";

// frontend/src/app/(admin)/admin/pos/orders/[id]/page.tsx
//
// This used to be an in-page modal rendered via createPortal. That's since
// been replaced with this dedicated route as a general structural
// improvement (a modal on the list page vs. a real, linkable/bookmarkable
// detail page) — but it turned out NOT to be the cause of "View" getting
// stuck on "Loading…" forever, since createPortal is a first-class,
// React-tracked way to render elsewhere in the document. The actual cause
// was the print engine appending a plain, non-React <iframe> into the live
// document — see lib/posReceipt.ts's openPrintWindow() for the full
// explanation and the fix (printing into a separate window instead).
//
// DYNAMIC ORDER-TYPE HANDLING: an order ID landing on this page isn't
// guaranteed to be a POS order — POSOrder and the online Order model are
// two entirely separate Mongo collections with different shapes, and a
// stale link, a bookmark, or someone pasting the wrong ID can point here
// with an online order's ID instead. Previously this just called
// /pos/orders/:id and had no fallback: a 404 there showed an error, but
// there was nothing to catch a genuine online order's ID other than that
// error. Now it checks POS first, and if that specific ID isn't a POS
// order, it transparently tries the online-order endpoint and redirects to
// the existing online order detail page if that's what the ID actually is
// — so this route "recognizes" either kind of order instead of assuming.
//
// HARD TIMEOUT: previously a stuck backend request (or MongoDB query) could
// leave this page spinning on "Loading…" forever, since nothing bounded how
// long the fetch was allowed to hang before surfacing an error. A 12s
// client-side timeout now guarantees the spinner always resolves to either
// data or a clear, actionable error — never an infinite spinner.
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import {
  ArrowLeft,
  Loader2,
  Printer,
  Download,
  XCircle,
  RefreshCcw,
} from "lucide-react";
import { apiGet, apiPut, getApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { PageLoader, ErrorState } from "@/components/shared/loading-spinner";
import { useToast } from "@/store/uiStore";
import {
  type POSOrder,
  printBothReceipts,
  downloadPosReceiptPdf,
} from "@/lib/posReceipt";

const FETCH_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error("TIMEOUT: request took too long")),
        ms,
      ),
    ),
  ]);
}

export default function POSOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [order, setOrder] = useState<POSOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const loadOrder = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await withTimeout(
        apiGet<any>(`/pos/orders/${id}`),
        FETCH_TIMEOUT_MS,
      );
      setOrder(res.data.order);
    } catch (err: any) {
      const is404 =
        axios.isAxiosError(err) && err.response?.status === 404;

      if (is404) {
        // Not a POS order — check whether it's actually an online order
        // before giving up, and hand off to that page if so.
        try {
          await withTimeout(apiGet<any>(`/orders/${id}`), FETCH_TIMEOUT_MS);
          router.replace(`/admin/orders/${id}`);
          return; // don't fall through to setIsLoading(false) below —
          // we're navigating away, not staying on this page.
        } catch {
          // Genuinely doesn't exist in either collection.
          setError("This order was not found as a POS order or an online order.");
        }
      } else if (err?.message?.startsWith("TIMEOUT")) {
        console.error("POS order fetch timed out:", { id, err });
        setError(
          "The server took too long to respond. Check your connection and try again.",
        );
      } else {
        console.error("POS order fetch failed:", { id, err });
        setError(getApiError(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePrint = () => {
    if (!order || printing) return;
    setPrinting(true);
    printBothReceipts(order, () => setPrinting(false));
  };

  const handleVoid = async () => {
    if (!order) return;
    if (!voidReason.trim()) {
      toast("Please enter a reason for voiding", "error");
      return;
    }
    setVoiding(true);
    try {
      await apiPut(`/pos/orders/${order.id}/void`, { reason: voidReason });
      toast("Order voided and stock restored", "success");
      loadOrder();
      setVoidReason("");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setVoiding(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (error || !order)
    return (
      <div className="p-6 space-y-4">
        <ErrorState message={error || "Order not found"} />
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={loadOrder}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
          >
            <RefreshCcw className="w-4 h-4" /> Retry
          </button>
          <Link
            href="/admin/pos/orders"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" /> Back to POS Orders
          </Link>
        </div>
      </div>
    );

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/pos/orders"
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {order.posOrderNumber}
          </h1>
          <p className="text-sm text-gray-500 font-mono">
            Receipt: {order.receiptNumber || "—"}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            order.status === "VOIDED"
              ? "bg-red-100 text-red-700"
              : order.status === "COMPLETED"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
          }`}
        >
          {order.status}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-500">Date/Time</p>
            <p className="font-medium">
              {new Date(order.createdAt).toLocaleString("en-NG")}
            </p>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-500">Staff</p>
            <p className="font-medium">{order.processedBy?.name || "—"}</p>
          </div>
          {order.customerName && (
            <div className="bg-gray-50 rounded p-3">
              <p className="text-xs text-gray-500">Customer</p>
              <p className="font-medium">{order.customerName}</p>
              {order.customerPhone && (
                <p className="text-xs text-gray-400">{order.customerPhone}</p>
              )}
            </div>
          )}
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-500">Payment</p>
            <p className="font-medium">{order.paymentMethod}</p>
            {order.amountTendered !== undefined && (
              <p className="text-xs text-gray-400">
                Tendered: {formatPrice(order.amountTendered)}
              </p>
            )}
            {order.changeGiven !== undefined && order.changeGiven > 0 && (
              <p className="text-xs text-gray-400">
                Change: {formatPrice(order.changeGiven)}
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
            {(order.items || []).map((item, i) => (
              <div
                key={item.id || i}
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
                  <p className="font-semibold">{formatPrice(item.subtotal)}</p>
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
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Discount</span>
              <span>-{formatPrice(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-gray-900 text-base pt-1 border-t">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        {/* Void */}
        {order.status === "COMPLETED" && (
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
              onClick={handleVoid}
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

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handlePrint}
          disabled={printing}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          title="Prints the customer copy, then the merchant (in-house) copy"
        >
          {printing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Printer className="w-4 h-4" />
          )}{" "}
          Print Receipts (2)
        </button>
        <button
          type="button"
          onClick={() => downloadPosReceiptPdf(order)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-sm"
          title="Downloads both copies as PDF files (customer + merchant)"
        >
          <Download className="w-4 h-4" /> Download (2 copies)
        </button>
      </div>
    </div>
  );
}
