"use client";
// frontend/src/app/(admin)/admin/shipping/page.tsx
// This page was returning 404. The shipping system lives at /admin/shipping/zones.
// This page redirects there immediately and also serves as a landing with quick links.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Truck, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ShippingIndexPage() {
  const router = useRouter();

  // Auto-redirect after a brief moment so the user sees where they're going
  useEffect(() => {
    const t = setTimeout(() => router.replace("/admin/shipping/zones"), 800);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shipping</h1>
        <p className="text-sm text-gray-500 mt-1">Redirecting to Shipping Zones…</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
        <Link
          href="/admin/shipping/zones"
          className="flex items-start gap-4 p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-green-500 hover:shadow-sm transition-all"
        >
          <div className="p-2.5 bg-green-50 rounded-xl">
            <MapPin className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Shipping Zones</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Define delivery areas by state or specific LGA
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 mt-1" />
        </Link>

        <Link
          href="/admin/shipping/zones"
          className="flex items-start gap-4 p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-green-500 hover:shadow-sm transition-all"
        >
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <Truck className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Shipping Methods</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Flat rate, weight-based, or store pickup per zone
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 mt-1" />
        </Link>
      </div>
    </div>
  );
}
