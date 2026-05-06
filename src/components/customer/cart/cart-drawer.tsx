"use client";
// frontend/src/components/customer/cart/cart-drawer.tsx

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  LogIn,
  UserPlus,
  ShoppingCart,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { formatPrice, getProductImage } from "@/lib/utils";
import {
  LoadingSpinner,
  EmptyState,
} from "@/components/shared/loading-spinner";
import Image from "next/image";

// ─── Auth required modal (shown when guest clicks Checkout) ──────────────────
function AuthRequiredModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { closeCart } = useCart();

  const go = (path: string) => {
    onClose();
    closeCart();
    router.push(path);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShoppingCart className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Almost there!</h2>
          <p className="text-sm text-gray-500 mt-1">
            Sign in or create an account to complete your order. Your cart items
            will be saved automatically.
          </p>
        </div>

        <div className="px-6 pb-6 space-y-3">
          {/* Sign in */}
          <button
            onClick={() => go("/login?redirect=/checkout")}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Sign In to Checkout
          </button>

          {/* Create account */}
          <button
            onClick={() => go("/register?redirect=/checkout")}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-green-600 text-green-700 font-semibold rounded-xl hover:bg-green-50 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Create Account
          </button>

          <p className="text-center text-xs text-gray-400 pt-1">
            Your cart items will be waiting for you after sign in
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────
export function CartDrawer() {
  const {
    items,
    subtotal,
    itemCount,
    isLoading,
    isOpen,
    isGuest,
    closeCart,
    updateQuantity,
    removeFromCart,
  } = useCart();
  const { isAuthenticated } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleCheckoutClick = () => {
    if (!isAuthenticated) {
      // Show auth modal instead of navigating
      setShowAuthModal(true);
    }
    // If authenticated, the Link handles navigation normally
  };

  return (
    <>
      {/* Auth modal */}
      {showAuthModal && (
        <AuthRequiredModal onClose={() => setShowAuthModal(false)} />
      )}

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-600" />
            <h2 className="font-semibold text-gray-900">
              Shopping Cart
              {itemCount > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({itemCount} {itemCount === 1 ? "item" : "items"})
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guest banner */}
        {isGuest && items.length > 0 && (
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-xs text-amber-700">
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            <span>Sign in to save your cart and track your order</span>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="Your cart is empty"
              description="Browse our products and add items to your cart"
              action={
                <Link
                  href="/products"
                  className="px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors"
                >
                  Shop Now
                </Link>
              }
            />
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                    <Image
                      src={getProductImage(item.product.images)}
                      alt={item.product.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                      {item.product.name}
                    </p>
                    {item.product.sku && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {item.product.sku}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-semibold text-brand-700">
                      {formatPrice(item.price)}
                    </p>
                    <div className="flex items-center justify-between mt-2.5">
                      {/* Quantity stepper */}
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
                          <button
                            onClick={() =>
                              updateQuantity(
                                isGuest ? item.productId : item.id,
                                item.quantity - 1,
                              )
                            }
                            disabled={item.quantity <= 1 || isLoading}
                            className="px-2.5 py-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-gray-900 select-none">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(
                                isGuest ? item.productId : item.id,
                                item.quantity + 1,
                              )
                            }
                            disabled={
                              item.quantity >= item.product.stockQuantity ||
                              isLoading
                            }
                            className="px-2.5 py-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        {item.quantity >= item.product.stockQuantity && (
                          <p className="text-[10px] text-red-500 font-medium leading-tight text-center">
                            Max stock ({item.product.stockQuantity}) reached
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-900">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() =>
                            removeFromCart(isGuest ? item.productId : item.id)
                          }
                          disabled={isLoading}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-5 space-y-4 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
              </span>
              <span className="font-bold text-gray-900 text-base">
                {formatPrice(subtotal)}
              </span>
            </div>
            <p className="text-xs text-gray-400 -mt-2">
              Shipping and taxes calculated at checkout
            </p>

            {/* Checkout button — different behaviour for guest vs auth */}
            {isAuthenticated ? (
              <Link
                href="/checkout"
                onClick={closeCart}
                className="w-full py-3.5 bg-brand-600 text-white text-sm font-semibold text-center rounded-xl hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
              >
                Checkout — {formatPrice(subtotal)}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={handleCheckoutClick}
                className="w-full py-3.5 bg-brand-600 text-white text-sm font-semibold text-center rounded-xl hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
              >
                Checkout — {formatPrice(subtotal)}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <Link
              href="/cart"
              onClick={closeCart}
              className="w-full py-2.5 border border-gray-200 text-gray-700 text-sm font-medium text-center rounded-xl hover:bg-gray-50 transition-colors block"
            >
              View Full Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
