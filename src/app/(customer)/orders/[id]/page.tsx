//frontend/src/app/(customer)/orders/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  CheckCircle,
  Upload,
  Loader2,
  ImageIcon,
  AlertCircle,
  Building2,
  Copy,
  Check,
} from "lucide-react";
import { Order } from "@/types";
import { apiGet, apiPost, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import {
  formatPrice,
  formatDateTime,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
  getProductImage,
} from "@/lib/utils";
import { PageLoader, ErrorState } from "@/components/shared/loading-spinner";
import Image from "next/image";

// ─── Bank details type ────────────────────────────────────────────────────────
interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode?: string;
}

// ─── Bank Transfer Panel ──────────────────────────────────────────────────────
function BankTransferPanel({
  order,
  onProofSubmitted,
}: {
  order: Order;
  onProofSubmitted: () => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [bank, setBank] = useState<BankDetails | null>(null);
  const [loadingBank, setLoadingBank] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [copied, setCopied] = useState<string>("");

  // Already submitted proof
  const hasSubmitted =
    (order as any).proofOfPaymentUrl ||
    order.paymentStatus === "AWAITING_PROOF";
  const isConfirmed = order.paymentStatus === "PAID";

  useEffect(() => {
    apiGet<any>("/payment/bank-details")
      .then((res) => setBank(res.data))
      .catch(() => {})
      .finally(() => setLoadingBank(false));
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to Cloudinary via existing upload endpoint
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "payment_proofs");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/upload/image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: formData,
        },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setUploadedUrl(data.data.url);
      toast("Receipt uploaded. Click Submit to confirm.", "success");
    } catch (err) {
      toast("Upload failed. Please try again.", "error");
      setPreviewUrl("");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!uploadedUrl) {
      toast("Please upload your payment receipt first", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/payment/bank-transfer/proof", {
        orderId: order.id,
        proofUrl: uploadedUrl,
      });
      toast(
        "Proof submitted! We'll confirm within 2–4 business hours.",
        "success",
      );
      onProofSubmitted();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Already confirmed ─────────────────────────────────────────────────────
  if (isConfirmed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-green-800">Payment Confirmed</p>
          <p className="text-sm text-green-700 mt-0.5">
            Your bank transfer has been verified. Your order is being processed.
          </p>
        </div>
      </div>
    );
  }

  // ── Proof already submitted, awaiting review ──────────────────────────────
  if (hasSubmitted) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-amber-800">
            Proof Submitted — Awaiting Review
          </p>
          <p className="text-sm text-amber-700 mt-0.5">
            Our team is reviewing your payment proof. We'll confirm within 2–4
            business hours. You'll receive an email once your order is
            confirmed.
          </p>
          {(order as any).proofOfPaymentUrl && (
            <a
              href={(order as any).proofOfPaymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-amber-700 underline"
            >
              <ImageIcon className="w-3 h-3" /> View submitted receipt
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── Main panel — bank details + proof upload ──────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-green-600" /> Bank Transfer Payment
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Transfer the exact amount below, then upload your receipt so we can
        confirm your order.
      </p>

      {/* Bank details */}
      {loadingBank ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : bank ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 space-y-3">
          {[
            { label: "Bank", value: bank.bankName },
            { label: "Account Name", value: bank.accountName },
            { label: "Account Number", value: bank.accountNumber },
            ...(bank.sortCode
              ? [{ label: "Sort Code", value: bank.sortCode }]
              : []),
            { label: "Amount", value: formatPrice((order as any).total) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-gray-500 w-32">{label}</span>
              <span className="font-semibold text-gray-900 text-sm flex-1 text-right">
                {value}
              </span>
              <button
                onClick={() => copyToClipboard(value, label)}
                className="ml-2 p-1 text-gray-400 hover:text-green-600 transition-colors"
                title={`Copy ${label}`}
              >
                {copied === label ? (
                  <Check className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Order reference reminder */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-center">
        <p className="text-xs text-amber-700 mb-1 font-medium">
          USE THIS AS YOUR TRANSFER NARRATION / REFERENCE
        </p>
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono font-bold text-amber-800 text-lg tracking-wide">
            {order.orderNumber}
          </span>
          <button
            onClick={() => copyToClipboard(order.orderNumber, "ref")}
            className="p-1 text-amber-600 hover:text-amber-800"
          >
            {copied === "ref" ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Proof upload */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-gray-800 mb-2">
          Upload Proof of Payment
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Upload a screenshot or photo of your bank transfer receipt or
          confirmation.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        {previewUrl ? (
          <div className="mb-3">
            <div className="relative w-full max-w-xs rounded-xl overflow-hidden border border-gray-200">
              <Image
                src={previewUrl}
                alt="Payment receipt preview"
                width={300}
                height={200}
                className="w-full object-cover"
              />
              {uploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                </div>
              )}
            </div>
            {!uploading && uploadedUrl && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" /> Uploaded successfully
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-gray-300 hover:border-green-400 rounded-xl p-6 flex flex-col items-center gap-2 text-gray-500 hover:text-green-600 transition-colors disabled:opacity-50"
          >
            <Upload className="w-6 h-6" />
            <span className="text-sm font-medium">Click to upload receipt</span>
            <span className="text-xs text-gray-400">JPG, PNG, or PDF</span>
          </button>
        )}

        <div className="flex gap-3 mt-3">
          {previewUrl && (
            <button
              onClick={() => {
                setPreviewUrl("");
                setUploadedUrl("");
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50"
            >
              Change File
            </button>
          )}
          <button
            onClick={handleSubmitProof}
            disabled={!uploadedUrl || submitting || uploading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> Submit Proof
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingForm, setTrackingForm] = useState({
    status: "",
    message: "",
    location: "",
  });

  const fetchOrder = async () => {
    try {
      const res = await apiGet<any>(`/orders/${id}`);
      setOrder(res.data.order);
    } catch (err) {
      setError("Order not found");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const addTrackingUpdate = async () => {
    if (!trackingForm.status || !trackingForm.message) {
      toast("Status and message are required", "error");
      return;
    }
    if (!order) return;
    try {
      await apiPost(`/orders/${order.id}/tracking`, trackingForm);
      toast("Tracking update added", "success");
      setTrackingForm({ status: "", message: "", location: "" });
      fetchOrder();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  if (isLoading) return <PageLoader />;
  if (error || !order)
    return (
      <div className="container py-12">
        <ErrorState message={error || "Order not found"} />
      </div>
    );

  const steps = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
  const currentStep = steps.indexOf(order.status);

  return (
    <div className="container py-10 max-w-3xl">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Order {order.orderNumber}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Placed on {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${ORDER_STATUS_COLORS[order.status]}`}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${PAYMENT_STATUS_COLORS[order.paymentStatus]}`}
          >
            {order.paymentStatus === "AWAITING_PROOF"
              ? "Awaiting Review"
              : order.paymentStatus}
          </span>
        </div>
      </div>

      {/* Progress tracker */}
      {!["CANCELLED", "REFUNDED"].includes(order.status) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-4 h-0.5 bg-gray-100 -z-10" />
            {steps.map((step, i) => {
              const done = i <= currentStep;
              const active = i === currentStep;
              return (
                <div
                  key={step}
                  className="flex flex-col items-center gap-1.5 z-10"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-400"}`}
                  >
                    {done ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-xs">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium ${active ? "text-brand-700" : done ? "text-gray-600" : "text-gray-400"}`}
                  >
                    {ORDER_STATUS_LABELS[step]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bank Transfer Panel — only for BANK_TRANSFER orders not yet paid ── */}
      {order.paymentMethod === "BANK_TRANSFER" && (
        <div className="mb-5">
          <BankTransferPanel order={order} onProofSubmitted={fetchOrder} />
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
        <h2 className="font-semibold text-gray-900 mb-4">Items Ordered</h2>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-4">
              <Image
                src={getProductImage(item.product.images)}
                alt={item.product.name}
                className="w-16 h-16 rounded-xl object-cover border border-gray-100 shrink-0"
                width={64}
                height={64}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">
                  {item.product.name}
                </p>
                <p className="text-xs text-gray-400 font-mono">
                  SKU: {item.product.sku}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Qty: {item.quantity}
                </p>
              </div>
              <p className="font-semibold text-gray-900 text-sm shrink-0">
                {formatPrice(item.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {/* Shipping address */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Shipping Address</h2>
          <address className="not-italic text-sm text-gray-600 space-y-0.5">
            <p className="font-medium text-gray-900">
              {order.shippingAddress?.firstName}{" "}
              {order.shippingAddress?.lastName}
            </p>
            <p>{order.shippingAddress?.address}</p>
            {order.shippingAddress?.addressLine2 && (
              <p>{order.shippingAddress.addressLine2}</p>
            )}
            <p>
              {order.shippingAddress?.city}, {order.shippingAddress?.state}
            </p>
            <p className="mt-1">{order.shippingAddress?.phone}</p>
          </address>
          {order.trackingNumber && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Tracking</p>
              <p className="text-sm font-mono font-medium text-brand-700">
                {order.trackingNumber}
              </p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatPrice(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>{formatPrice(order.shippingCost)}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-brand-700">{formatPrice(order.total)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
            <p>
              Payment:{" "}
              <span className="font-medium text-gray-700">
                {order.paymentMethod === "BANK_TRANSFER"
                  ? "Bank Transfer"
                  : order.paymentMethod}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Tracking update form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mt-5">
        <h3 className="font-semibold text-gray-900 mb-4">
          Add Tracking Update
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <input
              type="text"
              value={trackingForm.status}
              onChange={(e) =>
                setTrackingForm({ ...trackingForm, status: e.target.value })
              }
              placeholder="e.g., In Transit, Out for Delivery"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message *
            </label>
            <textarea
              value={trackingForm.message}
              onChange={(e) =>
                setTrackingForm({ ...trackingForm, message: e.target.value })
              }
              rows={2}
              placeholder="Describe the current status..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={trackingForm.location}
              onChange={(e) =>
                setTrackingForm({ ...trackingForm, location: e.target.value })
              }
              placeholder="Current location (optional)"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
            />
          </div>
          <button
            onClick={addTrackingUpdate}
            className="w-full px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700"
          >
            Add Tracking Update
          </button>
        </div>
      </div>
    </div>
  );
}
