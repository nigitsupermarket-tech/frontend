"use client";
// frontend/src/components/customer/product-card.tsx

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Minus, Plus, ShoppingCart, Info, Scale } from "lucide-react";
import { Product } from "@/types";
import { cn, formatPrice, getProductImage } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { usePriceVisibility } from "@/hooks/usePriceVisibility";
import { PriceLock } from "@/components/customer/price-lock";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { addToCart, isLoading: cartLoading } = useCart();
  const { pricesHidden } = usePriceVisibility();
  const [addedFeedback, setAddedFeedback] = useState(false);
  // Falls back to the placeholder if the stored image URL 404s/fails to
  // load (e.g. deleted from Cloudinary, or the optimizer can't reach it) —
  // shows a plain broken icon otherwise.
  const [imgFailed, setImgFailed] = useState(false);

  // ── Structured presets (e.g. "500g Pack", "1kg Bag") — takes priority
  // over the legacy continuous-scale UI below when present, matching the
  // product detail page's "Choose an option" behavior. ──────────────────
  const activeVariations = (product.variations || []).filter((v) => v.isActive);
  const hasVariations = activeVariations.length > 0;
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(
    () =>
      activeVariations.find((v) => v.isDefault)?.id ||
      activeVariations[0]?.id ||
      null,
  );
  const selectedVariation =
    activeVariations.find((v) => v.id === selectedVariationId) ||
    activeVariations[0] ||
    null;
  const [packCount, setPackCount] = useState(1);

  const variationAvailable = selectedVariation
    ? selectedVariation.stockQuantity !== null &&
      selectedVariation.stockQuantity !== undefined
      ? selectedVariation.stockQuantity // dedicated stock — packs on hand
      : Math.floor(
          (product.stockQuantity || 0) / (selectedVariation.quantity || 1),
        ) // shared pool
    : 0;
  const variationOutOfStock =
    !!selectedVariation && product.trackInventory && variationAvailable <= 0;

  // ── Legacy / continuous scalable product state (used when the product
  // has NO structured variations) ─────────────────────────────────────────
  const isScalable = !!product.isScalable && !hasVariations;
  const unit = product.scaleUnit || "unit";
  const step = product.scaleStep ?? 0.1;
  // Preset-only mode: scaleStep is 0, so there's no +/- increment — the
  // customer must tap one of the preset weights below.
  const presetOnly = isScalable && step === 0;
  const minQty = product.minOrderQty || (presetOnly ? 0 : step);
  // Never offer more than what's actually in stock, even if maxOrderQty
  // is higher — see the same fix in products/[slug]/page.tsx.
  const maxQty = product.trackInventory
    ? Math.min(product.maxOrderQty || Infinity, product.stockQuantity)
    : product.maxOrderQty || 9999;
  const presets = product.scalePresets?.length ? product.scalePresets : [];

  // For scalable: quantity is a float (kg, L, etc.). For fixed: integer.
  // In preset-only mode we start unselected (0) so "Add" stays disabled
  // until the customer explicitly taps a preset.
  const [quantity, setQuantity] = useState(
    isScalable ? (presetOnly ? 0 : minQty) : 1,
  );
  const hasSelection = hasVariations
    ? !!selectedVariation
    : !presetOnly || quantity > 0;

  // parseFloat + toFixed(10) avoids floating-point drift (e.g. 0.1+0.1+0.1 ≠ 0.3)
  const roundStep = (val: number) =>
    parseFloat((Math.round(val / step) * step).toFixed(10));

  const decrement = () => {
    if (presetOnly) return; // no increment in preset-only mode
    if (isScalable) {
      setQuantity((q) => Math.max(minQty, roundStep(q - step)));
    } else {
      setQuantity((q) => Math.max(1, q - 1));
    }
  };

  const increment = () => {
    if (presetOnly) return; // no increment in preset-only mode
    if (isScalable) {
      setQuantity((q) => Math.min(maxQty, roundStep(q + step)));
    } else {
      setQuantity((q) =>
        product.trackInventory ? Math.min(q + 1, product.stockQuantity) : q + 1,
      );
    }
  };

  // Effective price shown — variation price × packs, scalable pricePerUnit × qty, else product.price
  const effectivePrice = hasVariations
    ? (selectedVariation?.price || 0) * packCount
    : isScalable && product.pricePerUnit
      ? product.pricePerUnit * quantity
      : product.price;

  const isOutOfStock = hasVariations
    ? variationOutOfStock
    : product.stockStatus === "OUT_OF_STOCK" || product.stockQuantity === 0;

  const discount =
    product.comparePrice && product.comparePrice > product.price
      ? Math.round(
          ((product.comparePrice - product.price) / product.comparePrice) * 100,
        )
      : 0;

  const handleAdd = async () => {
    if (isOutOfStock) return;
    if (hasVariations) {
      if (!selectedVariation || packCount <= 0) return;
      await addToCart(product.id, packCount, {
        price: selectedVariation.price,
        name: product.name,
        image: product.images?.[0] || "",
        sku: selectedVariation.sku || product.sku,
        stockQuantity: variationAvailable,
        variationId: selectedVariation.id,
        variationLabel: selectedVariation.label,
      });
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 1500);
      return;
    }
    if (presetOnly && quantity <= 0) return; // must tap a preset first
    await addToCart(product.id, quantity, {
      price:
        isScalable && product.pricePerUnit
          ? product.pricePerUnit
          : product.price,
      name: product.name,
      image: product.images?.[0] || "",
      sku: product.sku,
      stockQuantity: product.stockQuantity,
      ...(isScalable && {
        isScalable: true,
        scaleUnit: unit,
        scaleStep: step,
        minOrderQty: minQty,
        maxOrderQty: product.maxOrderQty,
      }),
    });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);
  };

  const rating = product.averageRating || 0;
  const hasReviews = (product.reviewCount || 0) > 0;
  const showStars = hasReviews && rating >= 4;
  const filledStars = showStars ? Math.round(rating) : 0;

  const qtyDisplay =
    presetOnly && quantity <= 0
      ? "Select"
      : isScalable
        ? `${quantity % 1 === 0 ? quantity.toFixed(0) : quantity.toFixed(1)} ${unit}`
        : String(quantity);

  const atMin = presetOnly
    ? true
    : isScalable
      ? quantity <= minQty
      : quantity <= 1;
  const atMax = presetOnly
    ? true
    : isScalable
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
            src={
              imgFailed
                ? "/images/placeholder-product.svg"
                : getProductImage(product.images)
            }
            alt={product.name}
            fill
            className="object-contain p-2"
            sizes="(max-width: 768px) 40vw, (max-width: 1280px) 20vw, 15vw"
            onError={() => setImgFailed(true)}
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
          {hasVariations && (
            <span className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-green-700 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
              <Scale className="w-2 h-2" /> {activeVariations.length} options
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
              {hasVariations ? (
                <span className="font-semibold text-green-700">
                  {pricesHidden ? (
                    <PriceLock compact />
                  ) : (
                    <>
                      {selectedVariation
                        ? formatPrice(selectedVariation.price)
                        : ""}{" "}
                      / {selectedVariation?.label}
                    </>
                  )}
                </span>
              ) : isScalable ? (
                <span className="font-semibold text-green-700">
                  {pricesHidden ? (
                    <PriceLock compact />
                  ) : product.pricePerUnit ? (
                    `${formatPrice(product.pricePerUnit)}/${unit}`
                  ) : (
                    `per ${unit}`
                  )}
                </span>
              ) : product.unitsPerCarton ? (
                <>
                  <span className="font-bold text-green-700 block sm:inline">
                    {product.unitsPerCarton} units
                  </span>
                  <span className="text-gray-500">
                    {" "}
                    / {product.netWeight || "carton"}
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

          {/* ── Structured presets (e.g. "240 G" / "290 G") ── */}
          {hasVariations && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] sm:text-[9px] font-semibold text-gray-500 uppercase tracking-wide">
                Choose an option:
              </span>
              <div className="flex flex-wrap gap-1">
                {activeVariations.map((v) => {
                  const packsAvailable =
                    v.stockQuantity !== null && v.stockQuantity !== undefined
                      ? v.stockQuantity
                      : Math.floor(
                          (product.stockQuantity || 0) / (v.quantity || 1),
                        );
                  const soldOut = product.trackInventory && packsAvailable <= 0;
                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVariationId(v.id);
                        setPackCount(1);
                      }}
                      disabled={soldOut}
                      className={cn(
                        "text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors",
                        soldOut
                          ? "border-gray-200 text-gray-300 cursor-not-allowed line-through"
                          : selectedVariationId === v.id
                            ? "bg-green-600 text-white border-green-600"
                            : "border-gray-300 text-gray-600 hover:border-green-500",
                      )}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pack-count stepper for structured presets */}
          {hasVariations && (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <span className="text-[8px] sm:text-[9px] font-semibold text-gray-500 uppercase tracking-wide shrink-0">
                  QTY:
                </span>
                <div className="flex items-center border border-gray-300">
                  <button
                    onClick={() => setPackCount((q) => Math.max(1, q - 1))}
                    disabled={packCount <= 1}
                    className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                  </button>
                  <span className="w-10 sm:w-12 text-center text-[9px] sm:text-[10px] font-medium text-gray-800 px-0.5">
                    {packCount}
                  </span>
                  <button
                    onClick={() =>
                      setPackCount((q) =>
                        product.trackInventory
                          ? Math.min(q + 1, variationAvailable)
                          : q + 1,
                      )
                    }
                    disabled={
                      product.trackInventory && packCount >= variationAvailable
                    }
                    className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                  </button>
                </div>
              </div>
              {product.trackInventory && variationAvailable > 0 && (
                <p className="text-[8px] sm:text-[9px] text-gray-400 font-medium leading-tight">
                  {variationAvailable} available
                </p>
              )}
            </div>
          )}

          {/* ── Legacy bare-number presets (superseded by structured variations
              above — only rendered when the product has none) ── */}
          {!hasVariations && isScalable && presets.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {presetOnly && (
                <span className="text-[8px] sm:text-[9px] font-semibold text-gray-500 uppercase tracking-wide">
                  Select weight:
                </span>
              )}
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
                    {p}
                    {unit}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* QTY / scale selector — hidden in preset-only mode (scaleStep = 0)
              and when the product uses structured variations instead:
              no +/- increment is offered, the presets above are the only way
              to choose a quantity. */}
          {!hasVariations && !presetOnly && (
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
              {isScalable && product.trackInventory && quantity >= maxQty && (
                <p className="text-[8px] sm:text-[9px] text-orange-500 font-medium leading-tight">
                  Max: {product.stockQuantity} {unit} available
                </p>
              )}
              {!isScalable &&
                product.trackInventory &&
                quantity >= product.stockQuantity && (
                  <p className="text-[8px] sm:text-[9px] text-red-500 font-medium leading-tight">
                    Max stock reached ({product.stockQuantity} available)
                  </p>
                )}
            </div>
          )}
          {!hasVariations && presetOnly && quantity > 0 && (
            <p className="text-[8px] sm:text-[9px] text-gray-500 font-medium leading-tight">
              Selected: {qtyDisplay}
            </p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-1 flex-wrap">
            {pricesHidden ? (
              <PriceLock compact />
            ) : (
              <>
                <span className="text-xs sm:text-sm font-bold text-gray-900">
                  {formatPrice(effectivePrice)}
                </span>
                {hasVariations &&
                  selectedVariation?.compareAtPrice &&
                  selectedVariation.compareAtPrice >
                    selectedVariation.price && (
                    <span className="text-[9px] sm:text-[10px] text-gray-400 line-through">
                      {formatPrice(
                        selectedVariation.compareAtPrice * packCount,
                      )}
                    </span>
                  )}
                {!hasVariations &&
                  !isScalable &&
                  product.comparePrice &&
                  product.comparePrice > product.price && (
                    <span className="text-[9px] sm:text-[10px] text-gray-400 line-through">
                      {formatPrice(product.comparePrice)}
                    </span>
                  )}
              </>
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
              disabled={isOutOfStock || cartLoading || !hasSelection}
              title={!hasSelection ? "Select a preset weight first" : undefined}
              className={cn(
                "flex items-center justify-center gap-1 py-1.5 rounded text-[9px] sm:text-xs font-bold uppercase tracking-wide transition-all w-full",
                addedFeedback
                  ? "bg-green-600 text-white"
                  : isOutOfStock || !hasSelection
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-amber-400 hover:bg-amber-500 text-gray-900",
              )}
            >
              <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {addedFeedback
                ? "Added!"
                : isOutOfStock
                  ? "Sold Out"
                  : !hasSelection
                    ? "Select"
                    : "ADD"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
