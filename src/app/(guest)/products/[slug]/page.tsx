"use client";

import { useState } from "react";
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
} from "lucide-react";
import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { useSettings } from "@/hooks/useSettings";
import { formatPrice, calculateDiscountPercent, getProductImage } from "@/lib/utils";
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
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Request a Quote</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        {sent ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-brand-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Quote Sent!</h3>
            <p className="text-gray-500 text-sm">We will get back to you within 24 hours.</p>
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
              Product: <span className="font-semibold text-gray-900">{productName}</span> &times; {quantity}
            </p>
            {(
              [
                { key: "name", label: "Your Name", type: "text", required: true },
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional notes</label>
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
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
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
    `[ProductDetailPage] isLoading: ${isLoading}, error: ${error}, product: ${product?.name ?? "null"}`
  );

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"description" | "nutrition" | "reviews">("description");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  if (isLoading) {
    console.log("[ProductDetailPage] ⏳ Still loading product...");
    return <PageLoader />;
  }
  if (error || !product) {
    console.error("[ProductDetailPage] ❌ Error or missing product. error:", error, "| product:", product);
    return (
      <div className="container py-12">
        <ErrorState message={error || "Product not found"} />
      </div>
    );
  }

  console.log("[ProductDetailPage] ✅ Product loaded:", product.name, "| id:", product.id);

  const discount = product.comparePrice
    ? calculateDiscountPercent(product.comparePrice, product.price)
    : 0;
  const isOutOfStock = product.stockStatus === "OUT_OF_STOCK";
  const maxQty = product.trackInventory ? Math.min(product.stockQuantity, 99) : 99;

  // Certifications derived from schema booleans
  const certs: { label: string; color: string }[] = [
    ...(product.isHalal    ? [{ label: "Halal",       color: "bg-green-100 text-green-700"   }] : []),
    ...(product.isOrganic  ? [{ label: "Organic",     color: "bg-emerald-100 text-emerald-700" }] : []),
    ...(product.isVegan    ? [{ label: "Vegan",       color: "bg-lime-100 text-lime-700"     }] : []),
    ...(product.isKosher   ? [{ label: "Kosher",      color: "bg-blue-100 text-blue-700"     }] : []),
    ...(product.isGlutenFree ? [{ label: "Gluten-Free", color: "bg-yellow-100 text-yellow-700" }] : []),
  ];

  const nutritionalInfo = product.nutritionalInfo;
  const hasNutrition = nutritionalInfo && Object.values(nutritionalInfo).some((v) => v != null);

  // Package / origin details table
  const packageDetails: { label: string; value: string }[] = [
    ...(product.netWeight        ? [{ label: "Net Weight",       value: product.netWeight }]                : []),
    ...(product.packageSize      ? [{ label: "Package",          value: product.packageSize }]              : []),
    ...(product.unitsPerCarton   ? [{ label: "Units / Carton",   value: String(product.unitsPerCarton) }]   : []),
    ...(product.origin           ? [{ label: "Origin",           value: product.origin }]                   : []),
    ...(product.shelfLifeDays    ? [{ label: "Shelf Life",        value: `${product.shelfLifeDays} days` }]  : []),
    ...(product.servingSize      ? [{ label: "Serving Size",      value: product.servingSize }]              : []),
    ...(product.servingsPerPack  ? [{ label: "Servings / Pack",   value: product.servingsPerPack }]          : []),
    ...(product.naifdaNumber     ? [{ label: "NAFDAC No.",        value: product.naifdaNumber }]             : []),
    ...(product.weight           ? [{ label: "Shipping Weight",   value: `${product.weight} kg` }]          : []),
  ];

  return (
    <>
      {quoteOpen && (
        <QuoteModal productName={product.name} quantity={quantity} onClose={() => setQuoteOpen(false)} />
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
                      selectedImage === i ? "border-brand-500" : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <Image src={img} alt={`view ${i + 1}`} className="w-full h-full object-cover" width={80} height={80} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info column */}
          <div>
            {product.brand && (
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">{product.brand.name}</p>
            )}
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
              {product.name}
            </h1>

            {(product.netWeight || product.packageSize) && (
              <p className="text-sm text-gray-500 mt-1">
                {[product.netWeight, product.packageSize].filter(Boolean).join(" · ")}
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
                        i < Math.round(product.averageRating) ? "fill-amber-400 text-amber-400" : "text-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-brand-600 underline">
                  {product.averageRating.toFixed(1)} · {product.reviewCount ?? 0} reviews
                </span>
              </button>
            )}

            {!settings.hidePricing && (
              <div className="flex items-center gap-3 mt-4">
                <span className="text-3xl font-bold text-brand-700">{formatPrice(product.price)}</span>
                {product.comparePrice && product.comparePrice > product.price && (
                  <>
                    <span className="text-xl text-gray-400 line-through">{formatPrice(product.comparePrice)}</span>
                    <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-sm font-bold rounded-full">
                      -{discount}%
                    </span>
                  </>
                )}
              </div>
            )}

            {product.shortDescription && (
              <p className="mt-4 text-gray-600 leading-relaxed">{product.shortDescription}</p>
            )}

            {certs.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {certs.map((c) => <CertBadge key={c.label} label={c.label} color={c.color} />)}
              </div>
            )}

            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {product.tags.slice(0, 6).map((tag: string) => (
                  <span key={tag} className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full capitalize">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4">
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-red-600">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Out of Stock
                </span>
              ) : product.stockStatus === "LOW_STOCK" ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-orange-600">
                  <span className="w-2 h-2 rounded-full bg-orange-500" /> Low Stock — Only {product.stockQuantity} left
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500" /> In Stock
                </span>
              )}
            </div>

            {/* CTA buttons */}
            {settings.hidePricing ? (
              <div className="mt-6 flex items-center gap-3">
                <div className="flex items-center border border-gray-200 rounded-xl">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="px-3 py-3 text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-semibold">{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(99, quantity + 1))} disabled={quantity >= 99} className="px-3 py-3 text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => setQuoteOpen(true)} className="flex-1 py-3.5 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 flex items-center justify-center gap-2 transition-colors">
                  Request a Quote
                </button>
              </div>
            ) : !isOutOfStock ? (
              <div className="mt-6 flex items-center gap-3">
                <div className="flex items-center border border-gray-200 rounded-xl">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="px-3 py-3 text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-semibold">{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(maxQty, quantity + 1))} disabled={quantity >= maxQty} className="px-3 py-3 text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => addToCart(product.id, quantity, { price: product.price, name: product.name, image: product.images?.[0] || '', sku: product.sku, stockQuantity: product.stockQuantity })} disabled={cartLoading} className="flex-1 py-3.5 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                  <ShoppingCart className="w-5 h-5" /> Add to Cart
                </button>
                <button onClick={() => setWishlisted((w) => !w)} className={`p-3.5 border rounded-xl transition-colors ${wishlisted ? "border-red-300 text-red-500 bg-red-50" : "border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200"}`}>
                  <Heart className={`w-5 h-5 ${wishlisted ? "fill-red-500" : ""}`} />
                </button>
              </div>
            ) : null}

            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { icon: Truck,    label: "Fast Delivery"   },
                { icon: Shield,   label: "Secure Payment"  },
                { icon: RotateCcw, label: "Easy Returns"   },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 text-center">
                  <Icon className="w-5 h-5 text-brand-500" />
                  <span className="text-xs text-gray-600 font-medium">{label}</span>
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
                  activeTab === tab ? "text-brand-700 border-brand-600" : "text-gray-500 border-transparent hover:text-gray-900"
                }`}
              >
                {tab === "nutrition" ? "Nutrition & Details" : tab === "reviews" ? `Reviews${product.reviewCount ? ` (${product.reviewCount})` : ""}` : "Description"}
              </button>
            ))}
          </div>

          {/* Description */}
          {activeTab === "description" && (
            <div className="max-w-3xl">
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: product.description || "<p>No description available.</p>" }}
              />
              {product.storageInstructions && (
                <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <Package className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 mb-0.5">Storage Instructions</p>
                    <p className="text-sm text-amber-800">{product.storageInstructions}</p>
                  </div>
                </div>
              )}
              {product.allergens && product.allergens.length > 0 && (
                <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                  <Shield className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-900 mb-1">Allergen Information</p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.allergens.map((a: string) => (
                        <span key={a} className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">{a}</span>
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
                          <tr key={label} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                            <td className="px-5 py-3 text-sm font-semibold text-gray-700 w-1/2">{label}</td>
                            <td className="px-5 py-3 text-sm text-gray-600">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No package details available.</p>
                )}
                {product.ingredients && (
                  <div className="mt-6">
                    <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-brand-500" /> Ingredients
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">{product.ingredients}</p>
                  </div>
                )}
              </div>
              <div>
                {hasNutrition ? (
                  <>
                    <h3 className="text-base font-bold text-gray-900 mb-4">
                      Nutritional Information
                      {product.servingSize && <span className="text-xs font-normal text-gray-500 ml-2">per {product.servingSize}</span>}
                    </h3>
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <table className="w-full">
                        <tbody>
                          {(
                            [
                              { key: "calories", label: "Calories",      unit: "kcal" },
                              { key: "protein",  label: "Protein",       unit: "g"    },
                              { key: "carbs",    label: "Carbohydrates", unit: "g"    },
                              { key: "fat",      label: "Fat",           unit: "g"    },
                              { key: "fiber",    label: "Dietary Fibre", unit: "g"    },
                              { key: "sugar",    label: "Sugar",         unit: "g"    },
                              { key: "sodium",   label: "Sodium",        unit: "mg"   },
                            ] as const
                          )
                            .filter(({ key }) => nutritionalInfo[key] != null)
                            .map(({ key, label, unit }, i) => (
                              <tr key={key} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                                <td className="px-5 py-3 text-sm font-semibold text-gray-700 w-1/2">{label}</td>
                                <td className="px-5 py-3 text-sm text-gray-600">{nutritionalInfo[key]} {unit}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {product.servingsPerPack && (
                      <p className="text-xs text-gray-400 mt-2 px-1">Approx. {product.servingsPerPack} servings per pack</p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-40 text-sm text-gray-400 bg-gray-50 rounded-xl">
                    No nutritional info available
                  </div>
                )}
                {certs.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-base font-bold text-gray-900 mb-3">Certifications</h3>
                    <div className="flex flex-wrap gap-2">
                      {certs.map((c) => <CertBadge key={c.label} label={c.label} color={c.color} />)}
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
