"use client";
// frontend/src/app/(guest)/checkout/verify/page.tsx
// Paystack redirects here after payment: /checkout/verify?reference=SBW-xxx-timestamp

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { apiGet } from "@/lib/api";
import Link from "next/link";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading",
  );
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      return;
    }

    apiGet<any>(`/payment/verify/${reference}`)
      .then((res) => {
        const data = res.data;
        if (data.status === "success") {
          setOrderId(data.metadata?.orderId || "");
          setStatus("success");
        } else {
          setStatus("failed");
        }
      })
      .catch(() => setStatus("failed"));
  }, [reference]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Verifying your payment…</p>
          <p className="text-gray-400 text-sm mt-1">
            This will only take a moment.
          </p>
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow text-center max-w-md w-full mx-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h2>
          <p className="text-gray-600 mb-2">
            Your order has been confirmed and is being processed.
          </p>
          {reference && (
            <p className="text-xs text-gray-400 mb-6 font-mono">
              Ref: {reference}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            {orderId && (
              <Link
                href={`/orders/${orderId}`}
                className="px-5 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700"
              >
                Track Order
              </Link>
            )}
            <Link
              href="/products"
              className="px-5 py-2 border border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Failed ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow text-center max-w-md w-full mx-4">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Could Not Be Verified
        </h2>
        <p className="text-gray-600 mb-6">
          We couldn't confirm your payment. If your account was debited, please
          contact us with your reference number and we'll resolve it quickly.
        </p>
        {reference && (
          <p className="text-xs text-gray-400 mb-6 font-mono">
            Ref: {reference}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Link
            href="/checkout"
            className="px-5 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700"
          >
            Try Again
          </Link>
          <Link
            href="/contact"
            className="px-5 py-2 border border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
