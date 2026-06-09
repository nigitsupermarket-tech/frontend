"use client";
// frontend/src/components/customer/product-card.tsx

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Minus, Plus, ShoppingCart, Info, Scale } from "lucide-react";
import { Product } from "@/types";
import { cn, formatPrice, getProductImage } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { addToCart, isLoading: cartLoading } = useCart();
  const [addedFeedback, setAddedFeedback] = useState(false);

  // ── Scalable product state ─────────────────────────────────────────────────
  const isScalable = !!product.isScalable;
  const unit = product.scaleUnit || "unit";
  const step = product.scaleStep || 0.1;
  const minQty = product.minOrderQty || step;
  const maxQty = product.maxOrderQty || (product.trackInventory ? product.stockQuantity : 9999);
  const presets = product.scalePresets?.length ? product.scalePresets : [];

  // For scalable: quantity is a float (kg, L, etc.). For fixed: integer.
  const [quantity, setQuantity] = useState(isScalable ? minQty : 1);

  const roundStep = (val: number) => Math.round(val / step) * step;

  const decrement = () => {
    if (isScalable) {
      setQuantity((q) => Math.max(minQty, roundStep(q - step)));
    } else {
      setQuantity((q) => Math.max(1, q - 1));
    }
  };

  const increment = () => {
    if (isScalable) {
      setQuantity((q) => Math.min(maxQty, roundStep(q + step)));
    } else {
      setQuantity((q) =>
        product.trackInventory ? Math.min(q + 1, product.stockQuantity) : q + 1,
      );
    }
  };

  // Effective price shown — for scalable use pricePerUnit × qty, else product.price
  const effectivePrice = isScalable && product.pricePerUnit
    ? product.pricePerUnit * quantity
    : product.price;

  const isOutOfStock =
    product.stockStatus === "OUT_OF_STOCK" || product.stockQuantity === 0;

  const discount =
    product.comparePrice && product.comparePrice > product.price
      ? Math.round(
          ((product.comparePrice - product.price) / product.comparePrice) * 100,
        )
      : 0;

  const handleAdd = async () => {
    if (isOutOfStock) return;
    await addToCart(product.id, quantity, {
      price: isScalable && product.pricePerUnit ? product.pricePerUnit : product.price,
      name: product.name,
      image: product.images?.[0] || "",
      sku: product.sku,
      stockQuantity: product.stockQuantity,
      // Pass scale metadata for cart display
      ...(isScalable && {
        scaleUnit: unit,
        scaleQty: quantity,
      }),
    });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);
  };

  const rating = product.averageRating || 0;
  const hasReviews = (product.reviewCount || 0) > 0;
  const showStars = hasReviews && rating >= 4;
  const filledStars = showStars ? Math.round(rating) : 0;

  const qtyDisplay = isScalable
    ? `${quantity % 1 === 0 ? quantity.toFixed(0) : quantity.toFixed(1)} ${unit}`
    : String(quantity);

  const atMin = isScalable ? quantity <= minQty : quantity <= 1;
  const atMax = isScalable
    ? quantity >= maxQty
    : product.trackInventory && quantity >= product.stockQuantity;

  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-sm overflow-hidden",
        "hover:shadow-md hover:border-gray-300 transition-all duration-200",
        className,
      )}
    >
      {/* Title + Brand */}
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
          <Link
            href={`/brands/${product.brand.slug}`}
            className="text-[10px] sm:text-xs text-green-600 hover:underline mt-0.5 inline-block"
          >
            {product.brand.name}
          </Link>
        )}
      </div>

      {/* Image LEFT | Controls RIGHT */}
      <div className="flex">
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
          {isScalable && (
            <span className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-green-700 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
              <Scale className="w-2 h-2" /> per {unit}
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

        {/* Controls */}
        <div className="flex-1 flex flex-col gap-1.5 p-2 min-w-0">

          {/* Weight / units row */}
          <div className="flex items-start justify-between gap-1">
            <span className="text-[10px] sm:text-xs leading-tight">
              {isScalable ? (
                <span className="font-semibold text-green-700">
                  {product.pricePerUnit
                    ? `${formatPrice(product.pricePerUnit)}/${unit}`
                    : `per ${unit}`}
                </span>
              ) : product.unitsPerCarton ? (
                <>
                  <span className="font-bold text-green-700 block sm:inline">
                    {product.unitsPerCarton} units
                  </span>
                  <span className="text-gray-500">
                    {" "}/ {product.netWeight || "carton"}
                  </span>
                </>
              ) : product.netWeight ? (
                <span className="font-semibold text-green-700">
                  {product.netWeight}
                </span>
              ) : null}
            </span>

            {showStars && (
              <div
                className="flex gap-0.5 shrink-0 mt-0.5"
                title={`${rating.toFixed(1)} stars from ${product.reviewCount} reviews`}
              >
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      "w-2 h-2 sm:w-2.5 sm:h-2.5",
                      s <= filledStars
                        ? "fill-amber-400 text-amber-400"
                        : "fill-gray-200 text-gray-200",
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Scalable presets ── */}
          {isScalable && presets.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {presets.slice(0, 4).map((p) => (
                <button
                  key={p}
                  onClick={() => setQuantity(p)}
                  className={cn(
                    "text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors",
                    quantity === p
                      ? "bg-green-600 text-white border-green-600"
                      : "border-gray-300 text-gray-600 hover:border-green-500",
                  )}
                >
                  {p}{unit}
                </button>
              ))}
            </div>
          )}

          {/* QTY / scale selector */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[8px] sm:text-[9px] font-semibold text-gray-500 uppercase tracking-wide shrink-0">
                {isScalable ? "AMT:" : "QTY:"}
              </span>
              <div className="flex items-center border border-gray-300">
                <button
                  onClick={decrement}
                  className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  disabled={atMin}
                >
                  <Minus className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                </button>
                <span className="w-10 sm:w-12 text-center text-[9px] sm:text-[10px] font-medium text-gray-800 px-0.5">
                  {qtyDisplay}
                </span>
                <button
                  onClick={increment}
                  disabled={atMax}
                  className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                </button>
              </div>
            </div>
            {!isScalable && product.trackInventory && quantity >= product.stockQuantity && (
              <p className="text-[8px] sm:text-[9px] text-red-500 font-medium leading-tight">
                Max stock reached ({product.stockQuantity} available)
              </p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-gray-900">
              {formatPrice(effectivePrice)}
            </span>
            {!isScalable && product.comparePrice && product.comparePrice > product.price && (
              <span className="text-[9px] sm:text-[10px] text-gray-400 line-through">
                {formatPrice(product.comparePrice)}
              </span>
            )}
          </div>

          {/* CTA */}
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
                    : "bg-amber-400 hover:bg-amber-500 text-gray-900",
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
