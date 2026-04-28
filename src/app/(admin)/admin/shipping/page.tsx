"use client";
// frontend/src/app/(admin)/admin/shipping/page.tsx
// Shipping & Logistics Dashboard

import { useState, useEffect } from "react";
import {
  Truck,
  Package,
  MapPin,
  CheckCircle,
  Clock,
  BarChart3,
  ArrowRight,
  RefreshCw,
  Settings,
  AlertCircle,
  TrendingUp,
  Zap,
} from "lucide-react";
import { apiGet, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

interface DashboardStats {
  overview: {
    pendingShipment: number;
    inTransit: number;
    outForDelivery: number;
    delivered30d: number;
    deliveredToday: number;
    totalShippingRevenue: number;
    avgDeliveryDays: number | null;
  };
  configuration: {
    activeZones: number;
    activeMethods: number;
  };
  shipmentsByMethod: Array<{
    method: string;
    count: number;
    revenue: number;
  }>;
  recentShipments: Array<{
    id: string;
    orderNumber: string;
    status: string;
    customerName: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
    shippedAt?: string;
    deliveredAt?: string;
    shippingAddress: any;
  }>;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  SHIPPED: {
    label: "In Transit",
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  OUT_FOR_DELIVERY: {
    label: "Out for Delivery",
    color: "text-orange-700",
    bg: "bg-orange-50",
  },
  DELIVERED: {
    label: "Delivered",
    color: "text-green-700",
    bg: "bg-green-50",
  },
  CONFIRMED: {
    label: "Awaiting Dispatch",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
  },
  PROCESSING: {
    label: "Processing",
    color: "text-purple-700",
    bg: "bg-purple-50",
  },
};

export default function ShippingDashboardPage() {
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: DashboardStats }>(
        "/shipping/dashboard/stats",
      );
      setStats(res.data);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const ov = stats?.overview;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Shipping & Logistics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage shipments, tracking, zones and delivery methods
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/admin/shipping/ready"
          className="group bg-yellow-50 border border-yellow-200 rounded-2xl p-5 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-yellow-100 rounded-xl">
              <Package className="w-5 h-5 text-yellow-700" />
            </div>
            <ArrowRight className="w-4 h-4 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-3xl font-bold text-yellow-800">
            {ov?.pendingShipment ?? 0}
          </p>
          <p className="text-sm text-yellow-600 mt-1">Pending Dispatch</p>
        </Link>

        <Link
          href="/admin/shipping/shipments?status=SHIPPED"
          className="group bg-blue-50 border border-blue-200 rounded-2xl p-5 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Truck className="w-5 h-5 text-blue-700" />
            </div>
            <ArrowRight className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-3xl font-bold text-blue-800">
            {ov?.inTransit ?? 0}
          </p>
          <p className="text-sm text-blue-600 mt-1">In Transit</p>
        </Link>

        <Link
          href="/admin/shipping/shipments?status=OUT_FOR_DELIVERY"
          className="group bg-orange-50 border border-orange-200 rounded-2xl p-5 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Zap className="w-5 h-5 text-orange-700" />
            </div>
            <ArrowRight className="w-4 h-4 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-3xl font-bold text-orange-800">
            {ov?.outForDelivery ?? 0}
          </p>
          <p className="text-sm text-orange-600 mt-1">Out for Delivery</p>
        </Link>

        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-700" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
              Today: {ov?.deliveredToday ?? 0}
            </span>
          </div>
          <p className="text-3xl font-bold text-green-800">
            {ov?.delivered30d ?? 0}
          </p>
          <p className="text-sm text-green-600 mt-1">Delivered (30d)</p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-brand-600" />
            <span className="text-sm font-medium text-gray-500">
              Shipping Revenue (30d)
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatPrice(ov?.totalShippingRevenue ?? 0)}
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-brand-600" />
            <span className="text-sm font-medium text-gray-500">
              Avg Delivery Time
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {ov?.avgDeliveryDays != null ? `${ov.avgDeliveryDays} days` : "—"}
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-5 h-5 text-brand-600" />
            <span className="text-sm font-medium text-gray-500">
              Configuration
            </span>
          </div>
          <div className="flex gap-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.configuration.activeZones ?? 0}
              </p>
              <p className="text-xs text-gray-400">Active Zones</p>
            </div>
            <div className="border-l border-gray-100 pl-4">
              <p className="text-2xl font-bold text-gray-900">
                {stats?.configuration.activeMethods ?? 0}
              </p>
              <p className="text-xs text-gray-400">Methods</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            href: "/admin/shipping/ready",
            label: "Create Shipments",
            sub: "Dispatch confirmed orders",
            icon: Package,
            accent: "border-yellow-300 hover:border-yellow-400",
          },
          {
            href: "/admin/shipping/shipments",
            label: "All Shipments",
            sub: "Track & update deliveries",
            icon: Truck,
            accent: "border-blue-300 hover:border-blue-400",
          },
          {
            href: "/admin/shipping/zones",
            label: "Shipping Zones",
            sub: "Manage coverage areas",
            icon: MapPin,
            accent: "border-green-300 hover:border-green-400",
          },
          {
            href: "/admin/shipping/methods",
            label: "Delivery Methods",
            sub: "Rates & weight tables",
            icon: BarChart3,
            accent: "border-purple-300 hover:border-purple-400",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex flex-col gap-2 p-4 bg-white border-2 ${item.accent} rounded-2xl transition-all hover:shadow-sm`}
          >
            <item.icon className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {item.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Shipments by Method + Recent Shipments */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Shipments by Method */}
        <div className="md:col-span-2 bg-white border border-gray-100 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            Volume by Method (30d)
          </h3>
          {stats?.shipmentsByMethod && stats.shipmentsByMethod.length > 0 ? (
            <div className="space-y-3">
              {stats.shipmentsByMethod
                .sort((a, b) => b.count - a.count)
                .slice(0, 8)
                .map((item) => {
                  const maxCount = Math.max(
                    ...stats.shipmentsByMethod.map((s) => s.count),
                  );
                  const pct =
                    maxCount > 0
                      ? Math.round((item.count / maxCount) * 100)
                      : 0;
                  return (
                    <div key={item.method}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 truncate max-w-[60%]">
                          {item.method}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {item.count}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-brand-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No shipment data yet</p>
            </div>
          )}
        </div>

        {/* Recent Shipments */}
        <div className="md:col-span-3 bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Shipments</h3>
            <Link
              href="/admin/shipping/shipments"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              View all
            </Link>
          </div>
          {stats?.recentShipments && stats.recentShipments.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {stats.recentShipments.slice(0, 8).map((s) => {
                const cfg = statusConfig[s.status] || {
                  label: s.status,
                  color: "text-gray-700",
                  bg: "bg-gray-50",
                };
                const addr = s.shippingAddress as any;
                return (
                  <div
                    key={s.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/orders/${s.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-brand-600"
                        >
                          {s.orderNumber}
                        </Link>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {s.customerName} ·{" "}
                        {addr?.state || addr?.city || "Nigeria"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {s.trackingNumber && (
                        <p className="text-xs font-mono text-gray-500">
                          {s.trackingNumber}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {s.shippedAt
                          ? new Date(s.shippedAt).toLocaleDateString("en-NG", {
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Truck className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No recent shipments</p>
              <Link
                href="/admin/shipping/ready"
                className="mt-2 inline-block text-sm text-brand-600 hover:underline"
              >
                Dispatch orders →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Setup prompt if no configuration */}
      {stats && stats.configuration.activeZones === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">
              Shipping not configured
            </p>
            <p className="text-sm text-amber-700 mt-1">
              You have no active shipping zones. Seed the default Nigerian zones
              and rates to get started.
            </p>
            <div className="flex gap-3 mt-3">
              <SeedButton onSuccess={fetchStats} />
              <Link
                href="/admin/shipping/zones"
                className="px-4 py-2 text-sm font-medium text-amber-800 border border-amber-300 rounded-xl hover:bg-amber-100 transition-colors"
              >
                Configure manually
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SeedButton({ onSuccess }: { onSuccess: () => void }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    if (
      !confirm(
        "This will seed default Nigerian shipping zones and weight-based rates. Continue?",
      )
    )
      return;
    setLoading(true);
    try {
      const { apiPost } = await import("@/lib/api");
      const res = await apiPost<any>("/shipping/seed", {});
      toast(
        `Seeded ${res.data.zones} zones, ${res.data.methods} methods`,
        "success",
      );
      onSuccess();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSeed}
      disabled={loading}
      className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-60 transition-colors"
    >
      {loading ? "Seeding…" : "Seed Nigerian Zones & Rates"}
    </button>
  );
}
