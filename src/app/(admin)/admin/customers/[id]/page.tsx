"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { User, Order } from "@/types";
import { apiGet, apiPut, getApiError } from "@/lib/api";
import {
  formatPrice,
  formatDate,
  formatDateTime,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from "@/lib/utils";
import { PageLoader, ErrorState } from "@/components/shared/loading-spinner";
import { useToast } from "@/store/uiStore";
import Image from "next/image";

const segmentOptions = ["NEW", "REGULAR", "VIP", "WHOLESALE"];

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [segment, setSegment] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      apiGet<any>(`/users/${id}`),
      apiGet<any>("/orders", { userId: id, limit: 10 }),
    ])
      .then(([userRes, ordersRes]) => {
        setCustomer(userRes.data.user);
        setSegment(userRes.data.user.customerSegment || "NEW");
        setOrders(ordersRes.data.orders);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [id]);

  const updateSegment = async () => {
    setSaving(true);
    try {
      await apiPut(`/users/${id}`, { customerSegment: segment });
      toast("Segment updated", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!customer)
    return (
      <div className="p-6">
        <ErrorState message="Customer not found" />
      </div>
    );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/customers"
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Customer Profile</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="space-y-5">
          {/* Profile card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              {customer.image ? (
                <Image
                  src={customer.image}
                  alt={customer.name}
                  className="w-14 h-14 rounded-full object-cover"
                  width={56}
                  height={56}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-xl font-bold text-brand-700">
                  {customer.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-bold text-gray-900">{customer.name}</p>
                <p className="text-xs text-gray-500">{customer.email}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {customer.phone && (
                <p className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span>{customer.phone}</span>
                </p>
              )}
              <p className="flex justify-between">
                <span className="text-gray-500">Joined</span>
                <span>{formatDate(customer.createdAt)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">Email verified</span>
                <span>{customer.emailVerified ? "✓" : "✗"}</span>
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Statistics</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: "Orders", v: customer.orderCount },
                { l: "Total Spent", v: formatPrice(customer.totalSpent) },
                { l: "Points", v: customer.orderCount },
                { l: "Segment", v: customer.customerSegment },
              ].map(({ l, v }) => (
                <div key={l} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">{l}</p>
                  <p className="font-bold text-gray-900 mt-0.5 text-sm">
                    {v || "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Update segment */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">
              Customer Segment
            </h2>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-500 mb-3"
            >
              {segmentOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={updateSegment}
              disabled={saving}
              className="w-full py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Update Segment"}
            </button>
          </div>
        </div>

        {/* Order history */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900">Order History</h2>
            </div>
            {orders.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                No orders yet
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    {["Order", "Date", "Total", "Status", ""].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-sm text-gray-900">
                        {o.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {formatPrice(o.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[o.status]}`}
                        >
                          {ORDER_STATUS_LABELS[o.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
