"use client";
// frontend/src/components/customer/product-card.tsx
// Changes:
// 1. Brand link → /brands/[slug] instead of /products?brandId=...
// 2. Stars: only rendered when product.averageRating >= 4, filled dynamically (no fallback default)

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Minus, Plus, ShoppingCart, Info } from "lucide-react";
import { Product } from "@/types";
import { cn, formatPrice, getProductImage } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { addToCart, isLoading: cartLoading } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const isOutOfStock =
    product.stockStatus === "OUT_OF_STOCK" || product.stockQuantity === 0;
  const discount =
    product.comparePrice && product.comparePrice > product.price
      ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
      : 0;

  const handleAdd = async () => {
    if (isOutOfStock) return;
    await addToCart(product.id, quantity, {
      price: product.price,
      name: product.name,
      image: product.images?.[0] || "",
      sku: product.sku,
      stockQuantity: product.stockQuantity,
    });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);
  };

  // ── Stars: only show when there are real reviews AND rating ≥ 4 ──────────
  const rating = product.averageRating || 0;
  const hasReviews = (product.reviewCount || 0) > 0;
  const showStars = hasReviews && rating >= 4;
  const filledStars = showStars ? Math.round(rating) : 0;

  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-sm overflow-hidden",
        "hover:shadow-md hover:border-gray-300 transition-all duration-200",
        className
      )}
    >
      {/* Title + Brand above the split */}
      <div className="px-2.5 pt-2.5 pb-1">
        <Link
          href={`/products/${product.slug}`}
          className="block hover:text-green-700 transition-colors"
        >
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2 min-h-[2.2rem]">
            {product.name}
          </h3>
        </Link>
        {product.brand && (
          // ✅ SEO slug URL: /brands/peroni  (not /products?brandId=...)
          <Link
            href={`/brands/${product.brand.slug}`}
            className="text-[10px] sm:text-xs text-green-600 hover:underline mt-0.5 inline-block"
          >
            {product.brand.name}
          </Link>
        )}
      </div>

      {/* ── Main body: image LEFT | controls RIGHT ── */}
      <div className="flex">
        {/* Image — exactly 50% width */}
        <Link
          href={`/products/${product.slug}`}
          className="relative w-1/2 shrink-0 aspect-square bg-gray-50 border-r border-gray-100 overflow-hidden block"
        >
          <Image
            src={getProductImage(product.images)}
            alt={product.name}
            fill
            className="object-contain p-2"
            sizes="(max-width: 768px) 40vw, (max-width: 1280px) 20vw, 15vw"
          />
          {discount > 0 && (
            <span className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">
              -{discount}%
            </span>
          )}
          {product.isOnPromotion && !discount && (
            <span className="absolute top-1 right-1 bg-amber-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">
              PROMO
            </span>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="text-[9px] font-semibold text-gray-600 bg-gray-100 px-1 py-0.5 rounded">
                Out of Stock
              </span>
            </div>
          )}
        </Link>

        {/* Controls — right half */}
        <div className="flex-1 flex flex-col gap-1.5 p-2 min-w-0">
          {/* Units + Stars row */}
          <div className="flex items-start justify-between gap-1">
            <span className="text-[10px] sm:text-xs leading-tight">
              {product.unitsPerCarton ? (
                <>
                  <span className="font-bold text-green-700 block sm:inline">
                    {product.unitsPerCarton} units
                  </span>
                  <span className="text-gray-500"> / {product.netWeight || "carton"}</span>
                </>
              ) : product.netWeight ? (
                <span className="font-semibold text-green-700">{product.netWeight}</span>
              ) : null}
            </span>

            {/* ✅ Stars: only shown when hasReviews && rating >= 4 */}
            {showStars && (
              <div className="flex gap-0.5 shrink-0 mt-0.5" title={`${rating.toFixed(1)} stars from ${product.reviewCount} reviews`}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      "w-2 h-2 sm:w-2.5 sm:h-2.5",
                      s <= filledStars
                        ? "fill-amber-400 text-amber-400"
                        : "fill-gray-200 text-gray-200"
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* QTY */}
          <div className="flex items-center gap-1">
            <span className="text-[8px] sm:text-[9px] font-semibold text-gray-500 uppercase tracking-wide shrink-0">
              QTY:
            </span>
            <div className="flex items-center border border-gray-300">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                disabled={quantity <= 1}
              >
                <Minus className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
              </button>
              <span className="w-5 sm:w-7 text-center text-[10px] sm:text-xs font-medium text-gray-800">
                {quantity}
              </span>
              <button
                onClick={() =>
                  setQuantity((q) =>
                    product.trackInventory ? Math.min(q + 1, product.stockQuantity) : q + 1
                  )
                }
                className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                <Plus className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
              </button>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-gray-900">
              {formatPrice(product.price)}
            </span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-[9px] sm:text-[10px] text-gray-400 line-through">
                {formatPrice(product.comparePrice)}
              </span>
            )}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-stretch gap-1 mt-auto">
            <Link
              href={`/products/${product.slug}`}
              className="flex items-center justify-center gap-1 px-1.5 py-1.5 border border-gray-300 rounded text-[9px] sm:text-[10px] font-medium text-gray-600 hover:bg-gray-50 transition-colors w-full sm:w-auto sm:shrink-0"
            >
              <Info className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              Details
            </Link>
            <button
              onClick={handleAdd}
              disabled={isOutOfStock || cartLoading}
              className={cn(
                "flex items-center justify-center gap-1 py-1.5 rounded text-[9px] sm:text-xs font-bold uppercase tracking-wide transition-all w-full",
                addedFeedback
                  ? "bg-green-600 text-white"
                  : isOutOfStock
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-amber-400 hover:bg-amber-500 text-gray-900"
              )}
            >
              <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {addedFeedback ? "Added!" : isOutOfStock ? "Sold Out" : "ADD"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
