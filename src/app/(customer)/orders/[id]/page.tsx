"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Truck, CheckCircle, Clock } from "lucide-react";
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
      fetchOrder(); // Refresh order data
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
            {order.paymentStatus}
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
                {order.paymentMethod}
              </span>
            </p>
          </div>
        </div>
      </div>

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
