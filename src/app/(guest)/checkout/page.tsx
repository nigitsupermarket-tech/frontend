"use client";
// frontend/src/app/(guest)/checkout/page.tsx
// Auth gate: guests who navigate directly to /checkout see a login prompt.
// After login, guest cart items are merged automatically (mergeCart in useAuth login flow).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { LogIn, UserPlus, ShoppingCart, Loader2 } from "lucide-react";
import CheckoutPageContent from "./checkout-content";

export default function CheckoutPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const guestItems = useCartStore((s) => s.guestItems);
  const router = useRouter();

  // If user somehow arrives here as a guest (direct URL), show auth gate
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Ready to checkout?
          </h1>
          <p className="text-gray-500 text-sm mb-2">
            Sign in or create an account to complete your purchase.
          </p>
          {guestItems.length > 0 && (
            <p className="text-green-700 text-sm font-medium mb-6">
              ✓ Your {guestItems.length} cart item{guestItems.length !== 1 ? "s" : ""} will be saved
            </p>
          )}

          <div className="space-y-3">
            <a
              href="/login?redirect=/checkout"
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </a>
            <a
              href="/register?redirect=/checkout"
              className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-green-600 text-green-700 font-semibold rounded-xl hover:bg-green-50 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Create Account
            </a>
          </div>

          <button
            onClick={() => router.back()}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Back to shopping
          </button>
        </div>
      </div>
    );
  }

  // Authenticated — show full checkout
  return <CheckoutPageContent />;
}
