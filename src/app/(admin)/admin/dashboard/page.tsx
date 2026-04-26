"use client";
// frontend/src/app/(admin)/admin/dashboard/page.tsx

import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, ShoppingCart, Users, DollarSign,
  Store, BarChart2, Award, AlertTriangle, Clock, Package, Tag,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { ActivityWidget } from "@/components/admin/activity-widget";
import { formatPrice, formatNumber } from "@/lib/utils";
import { Skeleton } from "@/components/shared/loading-spinner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, sub, icon: Icon, trend, color, href }: {
  title: string; value: string; sub?: string; icon: React.ElementType;
  trend?: number; color: string; href?: string;
}) {
  const inner = (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow h-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1">
          {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-green-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
          <span className={`text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
            {Math.abs(trend)}% from last month
          </span>
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Staff view ───────────────────────────────────────────────────────────────
function StaffDashboard({ data }: { data: any }) {
  const { staff } = data;
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your personal sales summary</p>
      </div>
      {!staff.hasOpenSession && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">No open POS session</p>
            <p className="text-xs text-amber-700">Open a session before processing sales</p>
          </div>
          <Link href="/admin/pos" className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600">Open POS →</Link>
        </div>
      )}
      {staff.hasOpenSession && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-800">POS session is open</p>
          <Link href="/admin/pos" className="ml-auto px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700">Go to POS →</Link>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Sales Today" value={formatPrice(staff.today.sales)} sub={`${staff.today.orders} orders`} icon={DollarSign} color="bg-green-50 text-green-600" />
        <StatCard title="Orders Today" value={String(staff.today.orders)} icon={ShoppingCart} color="bg-blue-50 text-blue-600" />
        <StatCard title="This Month" value={formatPrice(staff.thisMonth.sales)} sub={`${staff.thisMonth.orders} orders`} icon={BarChart2} color="bg-purple-50 text-purple-600" />
        <StatCard title="Avg Order Today" value={staff.today.orders > 0 ? formatPrice(staff.today.sales / staff.today.orders) : "₦0"} icon={Award} color="bg-amber-50 text-amber-600" />
        <StatCard title="All-Time Orders" value={formatNumber(staff.allTime.orders)} icon={Package} color="bg-rose-50 text-rose-600" />
        <StatCard title="All-Time Sales" value={formatPrice(staff.allTime.sales)} icon={Store} color="bg-indigo-50 text-indigo-600" />
      </div>
      {staff.topProductsToday?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Products Today</h2>
          <div className="space-y-3">
            {staff.topProductsToday.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm text-gray-700 truncate">{p.productName}</span>
                <span className="text-xs text-gray-500">{p._sum.quantity} units</span>
                <span className="text-sm font-semibold">{formatPrice(p._sum.subtotal || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sales Manager view ───────────────────────────────────────────────────────
function SalesDashboard({ data, chart }: { data: any; chart: any[] }) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Sales Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Sales performance overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Online Orders (Month)" value={formatNumber(data.onlineOrders.thisMonth)} icon={ShoppingCart} color="bg-blue-50 text-blue-600" href="/admin/orders" />
        <StatCard title="Online Revenue (Month)" value={formatPrice(data.onlineRevenue.thisMonth)} icon={DollarSign} color="bg-green-50 text-green-600" />
        <StatCard title="POS Revenue (Month)" value={formatPrice(data.posRevenue.thisMonth)} sub={`${data.posOrders.today} POS orders today`} icon={Store} color="bg-purple-50 text-purple-600" href="/admin/pos/orders" />
        <StatCard title="POS Today" value={formatPrice(data.posRevenue.today)} icon={BarChart2} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Customers" value={formatNumber(data.customers.total)} sub={`${data.customers.newThisMonth} new this month`} icon={Users} color="bg-indigo-50 text-indigo-600" href="/admin/customers" />
        <StatCard title="Active Promotions" value={String(data.promotions.active)} icon={Tag} color="bg-rose-50 text-rose-600" href="/admin/promotions" />
        <StatCard title="Combined Revenue" value={formatPrice(data.onlineRevenue.thisMonth + data.posRevenue.thisMonth)} sub="Online + POS this month" icon={Award} color="bg-teal-50 text-teal-600" />
      </div>

      {/* Revenue chart */}
      {chart.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Revenue — Last 30 Days</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number, name: string) => [formatPrice(value), name === "pos" ? "POS" : "Online"]} />
              <Legend />
              <Line type="monotone" dataKey="online" stroke="#7c3aed" strokeWidth={2} dot={false} name="Online" />
              <Line type="monotone" dataKey="pos" stroke="#059669" strokeWidth={2} dot={false} name="POS" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Staff performance table */}
      {data.staffSales?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Staff Performance</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                <th className="pb-2 text-left">Staff</th>
                <th className="pb-2 text-right">Today Orders</th>
                <th className="pb-2 text-right">Today Sales</th>
                <th className="pb-2 text-right">Month Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.staffSales.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="py-3">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.role}</p>
                  </td>
                  <td className="py-3 text-right text-gray-700">{s.today.orders}</td>
                  <td className="py-3 text-right font-medium">{formatPrice(s.today.sales)}</td>
                  <td className="py-3 text-right font-semibold">{formatPrice(s.thisMonth.sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Admin view ───────────────────────────────────────────────────────────────
function AdminDashboard({ data, chart }: { data: any; chart: any[] }) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete business overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Online Revenue (Month)" value={formatPrice(data.revenue.thisMonth)} trend={data.revenue.growth} icon={DollarSign} color="bg-green-50 text-green-600" />
        <StatCard title="POS Revenue (Month)" value={formatPrice(data.revenue.thisMonthPOS)} icon={Store} color="bg-blue-50 text-blue-600" href="/admin/pos/orders" />
        <StatCard title="Combined Revenue" value={formatPrice(data.revenue.combinedThisMonth)} sub="Online + POS this month" icon={BarChart2} color="bg-purple-50 text-purple-600" />
        <StatCard title="Total Revenue" value={formatPrice(data.revenue.total)} sub={`₦${((data.revenue.allTimePOS || 0) / 1000).toFixed(0)}k via POS`} icon={Award} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Orders" value={formatNumber(data.orders.total)} sub={`${data.orders.today} today`} icon={ShoppingCart} color="bg-rose-50 text-rose-600" href="/admin/orders" />
        <StatCard title="Customers" value={formatNumber(data.customers.total)} sub={`${data.customers.newThisMonth} new`} icon={Users} color="bg-indigo-50 text-indigo-600" href="/admin/customers" />
        <StatCard title="Products" value={formatNumber(data.inventory.total)} sub={`${data.inventory.lowStock} low stock`} icon={Package} color="bg-orange-50 text-orange-600" href="/admin/inventory" />
        <StatCard title="POS Today" value={formatNumber(data.pos.ordersToday)} sub={formatPrice(data.pos.salesToday)} icon={Store} color="bg-teal-50 text-teal-600" href="/admin/pos" />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-5">Revenue — Last 30 Days (Online + POS)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: number, name: string) => [formatPrice(value), name === "online" ? "Online" : name === "pos" ? "POS" : "Combined"]} />
            <Legend />
            <Line type="monotone" dataKey="online" stroke="#7c3aed" strokeWidth={2} dot={false} name="Online" />
            <Line type="monotone" dataKey="pos" stroke="#059669" strokeWidth={2} dot={false} name="POS" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Staff Sales Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Staff POS Performance</h2>
          <span className="text-xs text-gray-400">Today / Month / All Time</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                <th className="pb-2 text-left">Staff</th>
                <th className="pb-2 text-left">Status</th>
                <th className="pb-2 text-right">Today</th>
                <th className="pb-2 text-right">Today Sales</th>
                <th className="pb-2 text-right">Month Sales</th>
                <th className="pb-2 text-right">All-Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data.staffSales || []).map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="py-3">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.role}</p>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.hasOpenSession ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.hasOpenSession ? "bg-green-500" : "bg-gray-400"}`} />
                      {s.hasOpenSession ? "Active" : "Offline"}
                    </span>
                  </td>
                  <td className="py-3 text-right text-gray-700">{s.today.orders}</td>
                  <td className="py-3 text-right font-medium">{formatPrice(s.today.sales)}</td>
                  <td className="py-3 text-right text-gray-700">{formatPrice(s.thisMonth.sales)}</td>
                  <td className="py-3 text-right font-semibold">{formatPrice(s.allTime.sales)}</td>
                </tr>
              ))}
              {(!data.staffSales || data.staffSales.length === 0) && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-400 text-xs">No staff found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.inventory.lowStock > 0 && (
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-900">{data.inventory.lowStock} low stock items</p>
              <Link href="/admin/inventory" className="text-xs text-orange-600 hover:underline">Review inventory →</Link>
            </div>
          </div>
        )}
        {data.orders.pending > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <Clock className="w-5 h-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">{data.orders.pending} pending orders</p>
              <Link href="/admin/orders?status=PENDING" className="text-xs text-blue-600 hover:underline">View orders →</Link>
            </div>
          </div>
        )}
        {data.promotions?.active > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
            <Tag className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">{data.promotions.active} active promotions</p>
              <Link href="/admin/promotions" className="text-xs text-amber-600 hover:underline">Manage →</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const [dashData, setDashData] = useState<any>(null);
  const [chart, setChart] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<any>("/analytics/dashboard"),
      apiGet<any>("/analytics/revenue?period=30"),
    ])
      .then(([statsRes, chartRes]) => {
        setDashData((statsRes as any).data);
        setChart((chartRes as any).data?.chart || []);
      })
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6"><div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div></div>;
  }

  if (!dashData) return null;

  if (dashData.viewType === "staff") return <StaffDashboard data={dashData} />;
  if (dashData.viewType === "sales") return <SalesDashboard data={dashData} chart={chart} />;
  return <AdminDashboard data={dashData} chart={chart} />;
}
