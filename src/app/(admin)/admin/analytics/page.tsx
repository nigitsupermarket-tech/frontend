"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  DollarSign,
  RefreshCcw,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { apiGet } from "@/lib/api";
import { formatPrice, formatNumber } from "@/lib/utils";
import { PageLoader } from "@/components/shared/loading-spinner";
import Image from "next/image";

const COLORS = ["#7c3aed", "#d97706", "#10b981", "#3b82f6", "#ef4444"];

export default function AdminAnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState("30");

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [ov, rev, top] = await Promise.all([
        apiGet<any>("/analytics/dashboard"),
        apiGet<any>("/analytics/revenue", { days: range }),
        apiGet<any>("/analytics/top-products", { limit: 5 }),
      ]);
      setOverview(ov.data);
      setRevenue(rev.data.data || []);
      setTopProducts(top.data.products || []);
      if (ov.data.ordersByStatus) {
        setOrdersByStatus(
          Object.entries(ov.data.ordersByStatus).map(([name, value]) => ({
            name,
            value,
          })),
        );
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [range]);

  if (isLoading) return <PageLoader />;

  const stats = [
    {
      icon: DollarSign,
      label: "Total Revenue",
      value: formatPrice(overview?.totalRevenue || 0),
      color: "text-brand-600",
      bg: "bg-brand-50",
    },
    {
      icon: ShoppingBag,
      label: "Total Orders",
      value: formatNumber(overview?.totalOrders || 0),
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: Users,
      label: "Total Customers",
      value: formatNumber(overview?.totalCustomers || 0),
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      icon: TrendingUp,
      label: "Avg Order Value",
      value: formatPrice(overview?.avgOrderValue || 0),
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Analytics & Reports</h1>
        <div className="flex items-center gap-3">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 12 months</option>
          </select>
          <button
            onClick={fetchAll}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-brand-600 hover:border-brand-300 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ icon: Icon, label, value, color, bg }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-gray-100 p-5"
          >
            <div
              className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}
            >
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue Trend</h2>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenue}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₦${formatNumber(v)}`}
                />
                <Tooltip
                  formatter={(v: any) => [formatPrice(v), "Revenue"]}
                  labelFormatter={(l) => `Date: ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
              No data for this period
            </div>
          )}
        </div>

        {/* Orders by status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Orders by Status</h2>
          {ordersByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={ordersByStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={false}
                >
                  {ordersByStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  formatter={(v) => <span className="text-xs">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
              No data
            </div>
          )}
        </div>
      </div>

      {/* Top products */}
      {topProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            Top Selling Products
          </h2>
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-4">
                <span className="w-6 text-xs font-bold text-gray-400">
                  #{i + 1}
                </span>
                <Image
                  src={p.images?.[0] || "/images/placeholder-product.png"}
                  alt={p.name}
                  className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0"
                  width={40}
                  height={40}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {p.name}
                  </p>
                  <p className="text-xs text-gray-400">{p.salesCount} sold</p>
                </div>
                <p className="font-semibold text-sm text-brand-700 shrink-0">
                  {formatPrice(p.revenue || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
