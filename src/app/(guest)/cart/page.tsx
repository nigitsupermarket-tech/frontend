//frontend/src/app/(guest)/cart/page.tsx
"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { formatPrice, getProductImage } from "@/lib/utils";
import { EmptyState } from "@/components/shared/loading-spinner";
import Image from "next/image";

export default function CartPage() {
  const {
    items,
    subtotal,
    itemCount,
    updateQuantity,
    removeFromCart,
    clearCart,
    isLoading,
  } = useCart();

  if (items.length === 0) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<ShoppingBag className="w-16 h-16" />}
          title="Your cart is empty"
          description="Looks like you haven't added anything yet."
          action={
            <Link
              href="/products"
              className="px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors"
            >
              Start Shopping
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container py-10 lg:py-14">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900">
          Shopping Cart{" "}
          <span className="text-gray-400 text-lg font-normal">
            ({itemCount} items)
          </span>
        </h1>
        <button
          onClick={clearCart}
          className="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          Clear cart
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Items list */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-5 bg-white rounded-2xl border border-gray-100 p-4"
            >
              <Link
                href={`/products/${item.product.slug}`}
                className="shrink-0"
              >
                <Image
                  src={getProductImage(item.product.images)}
                  alt={item.product.name}
                  className="w-24 h-24 rounded-xl object-cover border border-gray-100"
                  width={96}
                  height={96}
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${item.product.slug}`}
                  className="font-semibold text-gray-900 hover:text-brand-700 transition-colors line-clamp-2"
                >
                  {item.product.name}
                </Link>
                <p className="mt-1 text-lg font-bold text-brand-700">
                  {formatPrice(item.price)}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 border border-gray-200 rounded-xl px-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1 || isLoading}
                      className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-semibold text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={
                        item.quantity >= item.product.stockQuantity || isLoading
                      }
                      className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24">
            <h2 className="font-semibold text-gray-900 mb-5">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({itemCount} items)</span>
                <span className="font-medium text-gray-900">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-green-600 font-medium">
                  Calculated at checkout
                </span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-base">
                <span>Subtotal</span>
                <span className="text-brand-700">{formatPrice(subtotal)}</span>
              </div>
            </div>
            <Link
              href="/checkout"
              className="mt-6 w-full py-3.5 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/products"
              className="mt-3 w-full py-2.5 border border-gray-200 text-gray-700 text-sm font-medium text-center rounded-xl hover:bg-gray-50 transition-colors block text-center"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
