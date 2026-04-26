"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Heart, Trash2, ShoppingCart, ArrowRight, Package } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";
import { formatPrice, getProductImage, cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { ProductCardSkeleton } from "@/components/shared/loading-spinner";
import Image from "next/image";

export default function WishlistPage() {
  const {
    items,
    itemCount,
    isLoading,
    fetchWishlist,
    removeFromWishlist,
    clearWishlist,
  } = useWishlist();
  const { addToCart, isLoading: cartLoading } = useCart();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) fetchWishlist();
  }, [isAuthenticated, fetchWishlist]);

  // ── Not signed in ──
  if (!isAuthenticated) {
    return (
      <div className="container py-20 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
          <Heart className="w-9 h-9 text-red-300" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Your wishlist is waiting
        </h1>
        <p className="text-gray-500 max-w-sm mb-8">
          Sign in to save your favourite items and access them from any device.
        </p>
        <Link
          href="/login"
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          Sign in to view wishlist
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // ── Loading ──
  if (isLoading && items.length === 0) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-40 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-6 w-24 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (!isLoading && items.length === 0) {
    return (
      <div className="container py-20 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
          <Heart className="w-9 h-9 text-gray-300" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Nothing saved yet
        </h1>
        <p className="text-gray-500 max-w-sm mb-8">
          Browse our catalogue and tap the heart icon on any product to save it
          here.
        </p>
        <Link
          href="/products"
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          <Package className="w-4 h-4" />
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Heart className="w-6 h-6 fill-red-500 text-red-500" />
            My Wishlist
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {itemCount} saved {itemCount === 1 ? "item" : "items"}
          </p>
        </div>

        {itemCount > 0 && (
          <button
            onClick={clearWishlist}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear all
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {items.map(({ id, product }) => {
          if (!product) return null;
          const isOutOfStock = product.stockStatus === "OUT_OF_STOCK";
          const discount =
            product.comparePrice && product.comparePrice > product.price
              ? Math.round(
                  ((product.comparePrice - product.price) /
                    product.comparePrice) *
                    100,
                )
              : 0;

          return (
            <div
              key={id}
              className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-elevated hover:border-brand-100 transition-all duration-300 flex flex-col"
            >
              {/* Image */}
              <div className="relative aspect-square bg-gray-50 overflow-hidden">
                <Link href={`/products/${product.slug}`}>
                  <Image
                    src={getProductImage(product.images)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    width={500}
                    height={500}
                  />
                </Link>

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  {discount > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                      -{discount}%
                    </span>
                  )}
                  {isOutOfStock && (
                    <span className="px-2 py-0.5 bg-gray-800 text-white text-xs font-semibold rounded-full">
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* Remove from wishlist */}
                <button
                  onClick={() => removeFromWishlist(product.id)}
                  className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 duration-200"
                  aria-label="Remove from wishlist"
                >
                  <Heart className="w-4 h-4 fill-red-400" />
                </button>
              </div>

              {/* Info */}
              <div className="p-4 flex flex-col flex-1">
                {product.brand && (
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    {product.brand.name}
                  </p>
                )}
                <Link
                  href={`/products/${product.slug}`}
                  className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug hover:text-brand-700 transition-colors flex-1"
                >
                  {product.name}
                </Link>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-base font-bold text-brand-700">
                    {formatPrice(product.price)}
                  </span>
                  {product.comparePrice &&
                    product.comparePrice > product.price && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatPrice(product.comparePrice)}
                      </span>
                    )}
                </div>

                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/products/${product.slug}`}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center border border-brand-200 text-brand-700 hover:bg-brand-50 transition-colors"
                  >
                    Details
                  </Link>
                  <button
                    onClick={() => !isOutOfStock && addToCart(product.id)}
                    disabled={isOutOfStock || cartLoading}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors",
                      isOutOfStock
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-brand-600 text-white hover:bg-brand-700",
                    )}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {isOutOfStock ? "Sold Out" : "Add to Cart"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Continue shopping */}
      <div className="mt-12 text-center">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900 transition-colors"
        >
          Continue Shopping
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
