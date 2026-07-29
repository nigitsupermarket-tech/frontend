"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ShoppingCart,
  Star,
  Shield,
  Truck,
  RotateCcw,
  Minus,
  Plus,
  Heart,
  Check,
  Leaf,
  Thermometer,
  Snowflake,
  Package,
  Globe,
  X,
  Scale,
} from "lucide-react";
import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { useSettings } from "@/hooks/useSettings";
import {
  formatPrice,
  calculateDiscountPercent,
  getProductImage,
} from "@/lib/utils";
import { PageLoader, ErrorState } from "@/components/shared/loading-spinner";
import { ProductReviews } from "@/components/shared/product-reviews";
import Image from "next/image";

// ─── Quote modal ──────────────────────────────────────────────────────────────
function QuoteModal({
  productName,
  quantity,
  onClose,
}: {
  productName: string;
  quantity: number;
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Request a Quote</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {sent ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-brand-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Quote Sent!
            </h3>
            <p className="text-gray-500 text-sm">
              We will get back to you within 24 hours.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-gray-500">
              Product:{" "}
              <span className="font-semibold text-gray-900">{productName}</span>{" "}
              &times; {quantity}
            </p>
            {(
              [
                {
                  key: "name",
                  label: "Your Name",
                  type: "text",
                  required: true,
                },
                { key: "email", label: "Email", type: "email", required: true },
                { key: "phone", label: "Phone", type: "tel", required: false },
              ] as const
            ).map(({ key, label, type, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label} {required && "*"}
                </label>
                <input
                  type={type}
                  required={required}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 text-sm"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional notes
              </label>
              <textarea
                rows={3}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 text-sm resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 text-sm"
            >
              Send Quote Request
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Cert badge ───────────────────────────────────────────────────────────────
function CertBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}
    >
      <Check className="w-3 h-3" /> {label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  // ── DEBUG: trace slug page lifecycle ─────────────────────────────────────
  console.log("[ProductDetailPage] 🔵 Rendering, slug:", slug);

  const { product, isLoading, error } = useProduct(slug);
  const { addToCart, isLoading: cartLoading } = useCart();
  const { settings } = useSettings();

  // ── DEBUG: log fetch state changes ────────────────────────────────────────
  console.log(
    `[ProductDetailPage] isLoading: ${isLoading}, error: ${error}, product: ${product?.name ?? "null"}`,
  );

  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<
    "description" | "nutrition" | "reviews"
  >("description");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [favorited, setFavorited] = useState(false);

  // Scalable state — safe initial values; real values set after null guard below
  const [scaleQty, setScaleQty] = useState(0.1);
  const [quantity, setQuantity] = useState(1);
  const [scaleInput, setScaleInput] = useState(""); // typed input string for scalable

  // Structured variation selection (e.g. "500g Pack") and pack count
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [variationPacks, setVariationPacks] = useState(1);

  // Sync scaleQty to product's minOrderQty once product is loaded
  // Must be declared before any early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (!product) return;
    const isScalableProduct = !!product.isScalable;
    if (!isScalableProduct) return;
    const stepProduct = product.scaleStep ?? 0.1;
    // Preset-only (scaleStep === 0): start unselected so the customer must
    // explicitly tap a preset weight — no default quantity, no increment.
    if (stepProduct === 0) {
      setScaleQty(0);
      setScaleInput("");
      return;
    }
    const minQtyProduct = product.minOrderQty || stepProduct;
    if (minQtyProduct) {
      setScaleQty(minQtyProduct);
      setScaleInput(String(minQtyProduct));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // Default-select the "starting preset" (or first active option) whenever
  // a new product with structured variations loads.
  useEffect(() => {
    if (!product) return;
    const active = (product.variations || []).filter((v) => v.isActive);
    if (active.length === 0) {
      setSelectedVariationId(null);
      return;
    }
    const preferred = active.find((v) => v.isDefault) || active[0];
    setSelectedVariationId(preferred.id);
    setVariationPacks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (isLoading) {
    console.log("[ProductDetailPage] ⏳ Still loading product...");
    return <PageLoader />;
  }
  if (error || !product) {
    console.error(
      "[ProductDetailPage] ❌ Error or missing product. error:",
      error,
      "| product:",
      product,
    );
    return (
      <div className="container py-12">
        <ErrorState message={error || "Product not found"} />
      </div>
    );
  }

  console.log(
    "[ProductDetailPage] ✅ Product loaded:",
    product.name,
    "| id:",
    product.id,
  );

  // ── Scalable product values (safe — product is guaranteed non-null here) ──
  const isScalable = !!product.isScalable;
  const unit = product.scaleUnit || "unit";
  const step = product.scaleStep ?? 0.1;
  // Preset-only mode: no +/- increment or typed amount — must tap a preset.
  const presetOnly = isScalable && step === 0;
  const minQty = product.minOrderQty || (presetOnly ? 0 : step);
  const maxQtyScale =
    product.maxOrderQty ||
    (product.trackInventory ? product.stockQuantity : 9999);
  const presets = product.scalePresets?.length ? product.scalePresets : [];
  const hasScaleSelection = !presetOnly || scaleQty > 0;

  // ── Structured variations (labeled, individually-priced presets) ──────────
  const activeVariations = (product.variations || []).filter((v) => v.isActive);
  const hasVariations = activeVariations.length > 0;
  const selectedVariation = activeVariations.find((v) => v.id === selectedVariationId);
  const variationDedicated =
    !!selectedVariation &&
    selectedVariation.stockQuantity !== null &&
    selectedVariation.stockQuantity !== undefined;
  const variationMaxPacks = selectedVariation
    ? variationDedicated
      ? (selectedVariation.stockQuantity as number)
      : product.trackInventory
        ? Math.floor((product.stockQuantity ?? Infinity) / selectedVariation.quantity)
        : Infinity
    : Infinity;
  const variationPrice = selectedVariation ? selectedVariation.price * variationPacks : 0;

  const roundStep = (val: number) =>
    parseFloat((Math.round(val / step) * step).toFixed(10));
  const scaleDecrement = () => {
    if (presetOnly) return;
    setScaleQty((q) => Math.max(minQty, roundStep(q - step)));
  };
  const scaleIncrement = () => {
    if (presetOnly) return;
    setScaleQty((q) => Math.min(maxQtyScale, roundStep(q + step)));
  };

  const effectivePrice =
    isScalable && product.pricePerUnit
      ? product.pricePerUnit * scaleQty
      : product.price;

  const scaleDisplay = (v: number) =>
    v % 1 === 0 ? `${v.toFixed(0)} ${unit}` : `${v.toFixed(1)} ${unit}`;

  const discount = product.comparePrice
    ? calculateDiscountPercent(product.comparePrice, product.price)
    : 0;
  const isOutOfStock = product.stockStatus === "OUT_OF_STOCK";
  const maxQty = product.trackInventory
    ? Math.min(product.stockQuantity, 99)
    : 99;

  // Certifications derived from schema booleans
  const certs: { label: string; color: string }[] = [
    ...(product.isHalal
      ? [{ label: "Halal", color: "bg-green-100 text-green-700" }]
      : []),
    ...(product.isOrganic
      ? [{ label: "Organic", color: "bg-emerald-100 text-emerald-700" }]
      : []),
    ...(product.isVegan
      ? [{ label: "Vegan", color: "bg-lime-100 text-lime-700" }]
      : []),
    ...(product.isKosher
      ? [{ label: "Kosher", color: "bg-blue-100 text-blue-700" }]
      : []),
    ...(product.isGlutenFree
      ? [{ label: "Gluten-Free", color: "bg-yellow-100 text-yellow-700" }]
      : []),
  ];

  const nutritionalInfo = product.nutritionalInfo;
  const hasNutrition =
    nutritionalInfo && Object.values(nutritionalInfo).some((v) => v != null);

  // Package / origin details table
  const packageDetails: { label: string; value: string }[] = [
    ...(product.netWeight
      ? [{ label: "Net Weight", value: product.netWeight }]
      : []),
    ...(product.packageSize
      ? [{ label: "Package", value: product.packageSize }]
      : []),
    ...(product.unitsPerCarton
      ? [{ label: "Units / Carton", value: String(product.unitsPerCarton) }]
      : []),
    ...(product.origin ? [{ label: "Origin", value: product.origin }] : []),
    ...(product.shelfLifeDays
      ? [{ label: "Shelf Life", value: `${product.shelfLifeDays} days` }]
      : []),
    ...(product.servingSize
      ? [{ label: "Serving Size", value: product.servingSize }]
      : []),
    ...(product.servingsPerPack
      ? [{ label: "Servings / Pack", value: product.servingsPerPack }]
      : []),
    ...(product.naifdaNumber
      ? [{ label: "NAFDAC No.", value: product.naifdaNumber }]
      : []),
    ...(product.weight
      ? [{ label: "Shipping Weight", value: `${product.weight} kg` }]
      : []),
  ];

  return (
    <>
      {quoteOpen && (
        <QuoteModal
          productName={product.name}
          quantity={quantity}
          onClose={() => setQuoteOpen(false)}
        />
      )}

      <div className="container py-8 lg:py-12">
        {/* ── Top grid ── */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Images column */}
          <div className="space-y-4">
            <div className="aspect-square rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 relative">
              {product.requiresRefrigeration && (
                <span className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                  <Thermometer className="w-3 h-3" /> Refrigerate
                </span>
              )}
              {product.requiresFreezing && (
                <span className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-sky-700 text-white text-xs font-semibold px-2 py-1 rounded-full mt-7">
                  <Snowflake className="w-3 h-3" /> Freeze
                </span>
              )}
              <Image
                src={getProductImage(product.images, selectedImage)}
                alt={product.name}
                className="w-full h-full object-cover"
                width={600}
                height={600}
                priority
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {product.images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                      selectedImage === i
                        ? "border-brand-500"
                        : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`view ${i + 1}`}
                      className="w-full h-full object-cover"
                      width={80}
                      height={80}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info column */}
          <div>
            {product.brand && (
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">
                {product.brand.name}
              </p>
            )}
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
              {product.name}
            </h1>

            {(product.netWeight || product.packageSize) && (
              <p className="text-sm text-gray-500 mt-1">
                {[product.netWeight, product.packageSize]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}

            {product.averageRating > 0 && (
              <button
                onClick={() => setActiveTab("reviews")}
                className="flex items-center gap-2 mt-3 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(product.averageRating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-brand-600 underline">
                  {product.averageRating.toFixed(1)} ·{" "}
                  {product.reviewCount ?? 0} reviews
                </span>
              </button>
            )}

            {!settings.hidePricing && (
              <div className="flex items-center gap-3 mt-4">
                {hasVariations && selectedVariation ? (
                  <>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold text-brand-700">
                        {formatPrice(selectedVariation.price)}
                      </span>
                      {selectedVariation.compareAtPrice &&
                        selectedVariation.compareAtPrice > selectedVariation.price && (
                          <span className="text-lg text-gray-400 line-through">
                            {formatPrice(selectedVariation.compareAtPrice)}
                          </span>
                        )}
                      <span className="text-sm text-gray-400">
                        / {selectedVariation.label}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                      <Scale className="w-3 h-3" /> {activeVariations.length} option
                      {activeVariations.length === 1 ? "" : "s"}
                    </span>
                  </>
                ) : isScalable && product.pricePerUnit ? (
                  <>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold text-brand-700">
                        {formatPrice(effectivePrice)}
                      </span>
                      <span className="text-sm text-gray-400">
                        ({formatPrice(product.pricePerUnit)}/{unit})
                      </span>
                    </div>
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                      <Scale className="w-3 h-3" /> Sold per {unit}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-brand-700">
                      {formatPrice(product.price)}
                    </span>
                    {product.comparePrice &&
                      product.comparePrice > product.price && (
                        <>
                          <span className="text-xl text-gray-400 line-through">
                            {formatPrice(product.comparePrice)}
                          </span>
                          <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-sm font-bold rounded-full">
                            -{discount}%
                          </span>
                        </>
                      )}
                  </>
                )}
              </div>
            )}

            {product.shortDescription && (
              <p className="mt-4 text-gray-600 leading-relaxed">
                {product.shortDescription}
              </p>
            )}

            {certs.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {certs.map((c) => (
                  <CertBadge key={c.label} label={c.label} color={c.color} />
                ))}
              </div>
            )}

            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {product.tags.slice(0, 6).map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full capitalize"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4">
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-red-600">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Out of
                  Stock
                </span>
              ) : product.stockStatus === "LOW_STOCK" ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-orange-600">
                  <span className="w-2 h-2 rounded-full bg-orange-500" /> Low
                  Stock — Only {product.stockQuantity}
                  {isScalable ? ` ${unit}` : ""} left
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500" /> In
                  Stock
                </span>
              )}
            </div>

            {/* ── CTA ── */}
            {settings.hidePricing ? (
              <div className="mt-6 space-y-3">
                {/* Quote quantity selector */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-200 rounded-xl">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="px-3 py-3 text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-semibold">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(99, quantity + 1))}
                      className="px-3 py-3 text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => setQuoteOpen(true)}
                    className="flex-1 py-3.5 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 flex items-center justify-center gap-2 transition-colors"
                  >
                    Request a Quote
                  </button>
                </div>
              </div>
            ) : !isOutOfStock ? (
              <div className="mt-6 space-y-3">
                {/* ── Structured variation selector (labeled presets) ── */}
                {hasVariations ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">
                        Choose an option:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {activeVariations.map((v) => {
                          const dedicated =
                            v.stockQuantity !== null && v.stockQuantity !== undefined;
                          const available = dedicated
                            ? (v.stockQuantity as number)
                            : product.trackInventory
                              ? Math.floor(
                                  (product.stockQuantity ?? Infinity) / v.quantity,
                                )
                              : Infinity;
                          const soldOut = available <= 0;
                          const selected = v.id === selectedVariationId;
                          return (
                            <button
                              key={v.id}
                              disabled={soldOut}
                              onClick={() => {
                                setSelectedVariationId(v.id);
                                setVariationPacks(1);
                              }}
                              className={`flex flex-col items-start px-3.5 py-2 rounded-xl border-2 text-left transition-colors min-w-[110px] ${
                                soldOut
                                  ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                                  : selected
                                    ? "border-brand-600 bg-brand-50"
                                    : "border-gray-200 hover:border-brand-400"
                              }`}
                            >
                              <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                                {v.label}
                                {v.isDefault && (
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                                    DEFAULT
                                  </span>
                                )}
                              </span>
                              <span className="text-sm font-bold text-brand-700">
                                {formatPrice(v.price)}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {soldOut
                                  ? "Out of stock"
                                  : Number.isFinite(available)
                                    ? `${available} available`
                                    : "In stock"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedVariation && (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                            <button
                              onClick={() =>
                                setVariationPacks((n) => Math.max(1, n - 1))
                              }
                              disabled={variationPacks <= 1}
                              className="px-3 py-3 text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-14 text-center font-semibold text-sm">
                              {variationPacks}
                            </span>
                            <button
                              onClick={() =>
                                setVariationPacks((n) =>
                                  Math.min(variationMaxPacks, n + 1),
                                )
                              }
                              disabled={variationPacks >= variationMaxPacks}
                              className="px-3 py-3 text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="text-sm text-gray-500 font-medium">
                            {selectedVariation.label}
                            {variationPacks > 1 ? "s" : ""}
                          </span>
                          <div className="text-right flex-1">
                            <p className="text-2xl font-bold text-brand-700">
                              {formatPrice(variationPrice)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              addToCart(product.id, variationPacks, {
                                price: selectedVariation.price,
                                name: product.name,
                                image: product.images?.[0] || "",
                                sku: product.sku,
                                stockQuantity: variationMaxPacks,
                                variationId: selectedVariation.id,
                                variationLabel: selectedVariation.label,
                              })
                            }
                            disabled={cartLoading || variationMaxPacks < 1}
                            className="flex-1 py-3.5 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
                          >
                            <ShoppingCart className="w-5 h-5" />{" "}
                            Add {variationPacks}× {selectedVariation.label} to Cart
                          </button>
                          <button
                            onClick={() => setFavorited((w) => !w)}
                            className={`p-3.5 border rounded-xl transition-colors ${favorited ? "border-red-300 text-red-500 bg-red-50" : "border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200"}`}
                          >
                            <Heart
                              className={`w-5 h-5 ${favorited ? "fill-red-500" : ""}`}
                            />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : /* ── Scalable quantity selector (legacy, no structured variations) ── */
                isScalable ? (
                  <div className="space-y-3">
                    {/* Presets */}
                    {presets.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">
                          {presetOnly ? "Select a weight:" : "Quick select:"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {presets.map((p) => (
                            <button
                              key={p}
                              onClick={() => {
                                setScaleQty(p);
                                setScaleInput(String(p));
                              }}
                              className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                                scaleQty === p
                                  ? "bg-green-600 text-white border-green-600"
                                  : "border-gray-200 text-gray-700 hover:border-green-500"
                              }`}
                            >
                              {scaleDisplay(p)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {presetOnly && presets.length === 0 && (
                      <p className="text-xs text-red-500">
                        This product has no preset weights configured yet — it
                        can&apos;t be ordered until an admin adds one.
                      </p>
                    )}

                    {/* Stepper + direct input — hidden in preset-only mode
                        (scaleStep = 0). The presets above are the only way
                        to choose a quantity; no +/- increment or typing. */}
                    {!presetOnly && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                          <button
                            onClick={scaleDecrement}
                            disabled={scaleQty <= minQty}
                            className="px-3 py-3 text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          {/* Direct type-in input */}
                          <input
                            type="number"
                            min={minQty}
                            max={maxQtyScale || undefined}
                            step={step}
                            value={scaleInput}
                            onChange={(e) => {
                              setScaleInput(e.target.value);
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v) && v >= minQty) setScaleQty(v);
                            }}
                            onBlur={() => {
                              // Clamp on blur
                              const clamped = Math.min(
                                Math.max(scaleQty, minQty),
                                maxQtyScale,
                              );
                              setScaleQty(clamped);
                              setScaleInput(String(clamped));
                            }}
                            className="w-24 text-center font-semibold text-sm border-x border-gray-200 py-3 focus:outline-none focus:bg-green-50"
                            placeholder={`${minQty} ${unit}`}
                          />
                          <button
                            onClick={scaleIncrement}
                            disabled={scaleQty >= maxQtyScale}
                            className="px-3 py-3 text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-sm text-gray-500 font-medium">
                          {unit}
                        </span>
                        <div className="text-right flex-1">
                          <p className="text-2xl font-bold text-brand-700">
                            {formatPrice(effectivePrice)}
                          </p>
                          {product.pricePerUnit && (
                            <p className="text-xs text-gray-400">
                              {formatPrice(product.pricePerUnit)}/{unit}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {presetOnly && (
                      <div className="text-right">
                        <p className="text-2xl font-bold text-brand-700">
                          {formatPrice(effectivePrice)}
                        </p>
                        {product.pricePerUnit && (
                          <p className="text-xs text-gray-400">
                            {formatPrice(product.pricePerUnit)}/{unit}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Step hint */}
                    <p className="text-xs text-gray-400">
                      {presetOnly
                        ? "This product is sold in fixed preset weights only."
                        : `Min: ${scaleDisplay(minQty)} · Step: ${step} ${unit}${maxQtyScale < 9999 ? ` · Max: ${scaleDisplay(maxQtyScale)}` : ""}`}
                    </p>

                    {/* Add to cart */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          addToCart(product.id, scaleQty, {
                            price: product.pricePerUnit || product.price,
                            name: product.name,
                            image: product.images?.[0] || "",
                            sku: product.sku,
                            stockQuantity: product.stockQuantity,
                            isScalable: true,
                            scaleUnit: unit,
                            scaleStep: step,
                            minOrderQty: minQty,
                            maxOrderQty: product.maxOrderQty,
                          })
                        }
                        disabled={
                          cartLoading ||
                          (presetOnly ? !hasScaleSelection : scaleQty < minQty)
                        }
                        className="flex-1 py-3.5 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
                      >
                        <ShoppingCart className="w-5 h-5" />{" "}
                        {presetOnly && !hasScaleSelection
                          ? "Select a weight"
                          : `Add ${scaleDisplay(scaleQty)} to Cart`}
                      </button>
                      <button
                        onClick={() => setFavorited((w) => !w)}
                        className={`p-3.5 border rounded-xl transition-colors ${favorited ? "border-red-300 text-red-500 bg-red-50" : "border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200"}`}
                      >
                        <Heart
                          className={`w-5 h-5 ${favorited ? "fill-red-500" : ""}`}
                        />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard fixed-quantity selector */
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-gray-200 rounded-xl">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="px-3 py-3 text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-semibold">
                        {quantity}
                      </span>
                      <button
                        onClick={() =>
                          setQuantity(Math.min(maxQty, quantity + 1))
                        }
                        disabled={quantity >= maxQty}
                        className="px-3 py-3 text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() =>
                        addToCart(product.id, quantity, {
                          price: product.price,
                          name: product.name,
                          image: product.images?.[0] || "",
                          sku: product.sku,
                          stockQuantity: product.stockQuantity,
                        })
                      }
                      disabled={cartLoading}
                      className="flex-1 py-3.5 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
                    >
                      <ShoppingCart className="w-5 h-5" /> Add to Cart
                    </button>
                    <button
                      onClick={() => setFavorited((w) => !w)}
                      className={`p-3.5 border rounded-xl transition-colors ${favorited ? "border-red-300 text-red-500 bg-red-50" : "border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200"}`}
                    >
                      <Heart
                        className={`w-5 h-5 ${favorited ? "fill-red-500" : ""}`}
                      />
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { icon: Truck, label: "Fast Delivery" },
                { icon: Shield, label: "Secure Payment" },
                { icon: RotateCcw, label: "Easy Returns" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 text-center"
                >
                  <Icon className="w-5 h-5 text-brand-500" />
                  <span className="text-xs text-gray-600 font-medium">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-gray-400">SKU: {product.sku}</p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="mt-12 border-t border-gray-100 pt-8">
          <div className="flex gap-6 border-b border-gray-100 mb-8 overflow-x-auto">
            {(["description", "nutrition", "reviews"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium whitespace-nowrap capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? "text-brand-700 border-brand-600"
                    : "text-gray-500 border-transparent hover:text-gray-900"
                }`}
              >
                {tab === "nutrition"
                  ? "Nutrition & Details"
                  : tab === "reviews"
                    ? `Reviews${product.reviewCount ? ` (${product.reviewCount})` : ""}`
                    : "Description"}
              </button>
            ))}
          </div>

          {/* Description */}
          {activeTab === "description" && (
            <div className="max-w-3xl">
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{
                  __html:
                    product.description || "<p>No description available.</p>",
                }}
              />
              {product.storageInstructions && (
                <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <Package className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 mb-0.5">
                      Storage Instructions
                    </p>
                    <p className="text-sm text-amber-800">
                      {product.storageInstructions}
                    </p>
                  </div>
                </div>
              )}
              {product.allergens && product.allergens.length > 0 && (
                <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                  <Shield className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-900 mb-1">
                      Allergen Information
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.allergens.map((a: string) => (
                        <span
                          key={a}
                          className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nutrition & Details */}
          {activeTab === "nutrition" && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-brand-500" /> Product Details
                </h3>
                {packageDetails.length > 0 ? (
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full">
                      <tbody>
                        {packageDetails.map(({ label, value }, i) => (
                          <tr
                            key={label}
                            className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}
                          >
                            <td className="px-5 py-3 text-sm font-semibold text-gray-700 w-1/2">
                              {label}
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-600">
                              {value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No package details available.
                  </p>
                )}
                {product.ingredients && (
                  <div className="mt-6">
                    <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-brand-500" /> Ingredients
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">
                      {product.ingredients}
                    </p>
                  </div>
                )}
              </div>
              <div>
                {hasNutrition ? (
                  <>
                    <h3 className="text-base font-bold text-gray-900 mb-4">
                      Nutritional Information
                      {product.servingSize && (
                        <span className="text-xs font-normal text-gray-500 ml-2">
                          per {product.servingSize}
                        </span>
                      )}
                    </h3>
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <table className="w-full">
                        <tbody>
                          {(
                            [
                              {
                                key: "calories",
                                label: "Calories",
                                unit: "kcal",
                              },
                              { key: "protein", label: "Protein", unit: "g" },
                              {
                                key: "carbs",
                                label: "Carbohydrates",
                                unit: "g",
                              },
                              { key: "fat", label: "Fat", unit: "g" },
                              {
                                key: "fiber",
                                label: "Dietary Fibre",
                                unit: "g",
                              },
                              { key: "sugar", label: "Sugar", unit: "g" },
                              { key: "sodium", label: "Sodium", unit: "mg" },
                            ] as const
                          )
                            .filter(({ key }) => nutritionalInfo[key] != null)
                            .map(({ key, label, unit }, i) => (
                              <tr
                                key={key}
                                className={
                                  i % 2 === 0 ? "bg-gray-50" : "bg-white"
                                }
                              >
                                <td className="px-5 py-3 text-sm font-semibold text-gray-700 w-1/2">
                                  {label}
                                </td>
                                <td className="px-5 py-3 text-sm text-gray-600">
                                  {nutritionalInfo[key]} {unit}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {product.servingsPerPack && (
                      <p className="text-xs text-gray-400 mt-2 px-1">
                        Approx. {product.servingsPerPack} servings per pack
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-40 text-sm text-gray-400 bg-gray-50 rounded-xl">
                    No nutritional info available
                  </div>
                )}
                {certs.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-base font-bold text-gray-900 mb-3">
                      Certifications
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {certs.map((c) => (
                        <CertBadge
                          key={c.label}
                          label={c.label}
                          color={c.color}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reviews */}
          {activeTab === "reviews" && <ProductReviews productId={product.id} />}
        </div>
      </div>
    </>
  );
}
