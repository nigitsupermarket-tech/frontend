"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Package, Truck, CheckCircle, MapPin, Clock } from "lucide-react";
import { apiGet, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

interface TrackingUpdate {
  id: string;
  status: string;
  message: string;
  location?: string;
  timestamp: string;
}

interface OrderTracking {
  id: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  createdAt: string;
  shippedAt?: string;
  trackingUpdates: TrackingUpdate[];
}

export default function OrderTrackingPage() {
  const params = useParams();
  const toast = useToast();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTracking();
  }, [orderId]);

  const fetchTracking = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<{
        success: boolean;
        data: { order: OrderTracking };
      }>(`/orders/${orderId}/tracking`);
      setOrder(res.data.order);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("delivered")) return CheckCircle;
    if (s.includes("transit") || s.includes("shipped")) return Truck;
    if (s.includes("confirmed") || s.includes("placed")) return Package;
    return MapPin;
  };

  if (isLoading) {
    return (
      <div className="container py-20 text-center">
        <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading tracking information...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container py-20 text-center">
        <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Order not found
        </h2>
        <p className="text-gray-600">
          We couldn't find tracking information for this order
        </p>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-3xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-600 rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-brand-200 text-sm mb-1">Order Number</p>
            <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              order.status === "DELIVERED"
                ? "bg-green-500"
                : order.status === "SHIPPED"
                  ? "bg-blue-500"
                  : "bg-yellow-500"
            }`}
          >
            {order.status}
          </span>
        </div>

        {order.trackingNumber && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-brand-200">Tracking #:</span>
            <span className="font-mono font-semibold">
              {order.trackingNumber}
            </span>
          </div>
        )}

        {order.estimatedDelivery && !order.deliveredAt && (
          <div className="flex items-center gap-2 text-sm mt-2">
            <Clock className="w-4 h-4" />
            <span className="text-brand-200">Estimated delivery:</span>
            <span className="font-semibold">
              {new Date(order.estimatedDelivery).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Tracking Timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-6">Tracking Updates</h2>

        <div className="space-y-6">
          {order.trackingUpdates.map((update, index) => {
            const Icon = getStatusIcon(update.status);
            const isLatest = index === 0;

            return (
              <div key={update.id} className="relative">
                {/* Timeline Line */}
                {index < order.trackingUpdates.length - 1 && (
                  <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200" />
                )}

                <div className="flex gap-4">
                  {/* Icon */}
                  <div
                    className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      isLatest ? "bg-brand-600" : "bg-gray-100"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${isLatest ? "text-white" : "text-gray-400"}`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <p
                        className={`font-semibold ${isLatest ? "text-brand-600" : "text-gray-900"}`}
                      >
                        {update.status}
                      </p>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTime(update.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{update.message}</p>
                    {update.location && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {update.location}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* External Tracking Link */}
      {order.trackingUrl && (
        <div className="mt-6">
          <Link
            href={order.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center px-6 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-700 transition-colors"
          >
            Track with Carrier →
          </Link>
        </div>
      )}
    </div>
  );
}
