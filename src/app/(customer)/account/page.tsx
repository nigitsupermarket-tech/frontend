//frontend/src/app/(customer)/account/page.tsx
"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";
import {
  User,
  ShoppingBag,
  LayoutDashboard,
  MapPin,
  Settings,
  LogOut,
  ArrowRight,
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";

export default function AccountPage() {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "STAFF";

  const menuItems = [
    {
      icon: ShoppingBag,
      label: "Order History",
      href: "/account/orders",
      desc: "Track and manage your orders",
    },
    {
      icon: MapPin,
      label: "Saved Addresses",
      href: "/account/addresses",
      desc: "Manage your delivery addresses",
    },
    {
      icon: Settings,
      label: "Profile Settings",
      href: "/account/profile",
      desc: "Update your personal details",
    },
  ];

  return (
    <div className="container py-10 max-w-3xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-600 rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">{user?.name}</h1>
            <p className="text-brand-200 text-sm">{user?.email}</p>
            {user?.customerSegment && (
              <span className="mt-1 inline-block px-2 py-0.5 bg-white/20 text-white text-xs font-medium rounded-full">
                {user.customerSegment} Customer
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/20">
          <div>
            <p className="text-brand-200 text-xs">Total Orders</p>
            <p className="text-xl font-bold">{user?.orderCount || 0}</p>
          </div>
          <div>
            <p className="text-brand-200 text-xs">Total Spent</p>
            <p className="text-xl font-bold">
              {formatPrice(user?.totalSpent || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Admin Dashboard Button */}
      {isAdmin && (
        <Link
          href="/admin/dashboard"
          className="flex items-center justify-between gap-4 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-5 mb-4 text-white hover:from-gray-800 hover:to-gray-700 transition-all group shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Admin Dashboard</p>
              <p className="text-sm text-gray-300">
                Manage products, orders & more
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}

      {/* Menu */}
      <div className="space-y-3 mb-8">
        {menuItems.map(({ icon: Icon, label, href, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 hover:border-brand-200 hover:shadow-sm transition-all group"
          >
            <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{label}</p>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-600 transition-colors" />
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <button
        onClick={logout}
        className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}
