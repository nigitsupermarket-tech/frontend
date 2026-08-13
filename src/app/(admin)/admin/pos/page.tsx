"use client";
// frontend/src/app/(admin)/admin/pos/page.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  CheckCircle,
  X,
  ShoppingCart,
  Receipt,
  Calculator,
  Tag,
  RotateCcw,
  Clock,
  Package,
  Loader2,
  ChevronDown,
  LogIn,
  LogOut,
  User,
  AlertCircle,
  DollarSign,
  Grid3x3,
  LayoutList,
  Camera,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { apiGet, apiPost, apiPut, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatPrice } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { ScaleProvider, useScale } from "@/lib/scale/ScaleContext";
import ScalePanel from "@/components/admin/pos/ScalePanel";
import WeighModal from "@/components/admin/pos/WeighModal";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProductVariation {
  id: string;
  label: string;
  quantity: number;
  price: number;
  compareAtPrice?: number | null;
  barcode?: string | null;
  stockQuantity?: number | null; // null = shared stock, number = dedicated
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}
interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  stockQuantity: number;
  images: string[];
  trackInventory: boolean;
  netWeight?: string;
  unitsPerCarton?: number;
  category?: { name: string };
  brand?: { name: string };
  // Scalable product
  isScalable?: boolean;
  scaleUnit?: string;
  pricePerUnit?: number;
  minOrderQty?: number;
  maxOrderQty?: number;
  scaleStep?: number;
  scalePresets?: number[];
  variations?: ProductVariation[];
}
interface CartItem {
  product: Product;
  quantity: number; // for scalable: float amount (e.g. 1.5kg); for a variation: PACK COUNT
  unitPrice: number; // for scalable: pricePerUnit; for fixed: product.price; for a variation: variation.price
  discount: number;
  variationId?: string; // set when this line is a specific product variation/preset
  variationLabel?: string;
}
interface Discount {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  name: string;
}
type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "SPLIT";
interface SplitPayment {
  method: "CASH" | "CARD" | "TRANSFER";
  amount: number;
}
interface CompletedOrder {
  posOrderNumber: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountTendered?: number;
  changeGiven?: number;
  splitPayments?: SplitPayment[];
  customerName?: string;
  customerPhone?: string;
  processedAt: Date;
  receiptNumber: string;
}
// A POS order that has been suspended (retrieved from the API)
interface SuspendedOrder {
  id: string;
  posOrderNumber: string;
  suspendedAt: string;
  suspendLabel?: string | null;
  customerName?: string | null;
  subtotal: number;
  total: number;
  items: {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    discountApplied: number;
    barcode?: string | null;
    netWeight?: string | null;
    scaleUnit?: string | null;
    variationId?: string | null;
    variationLabel?: string | null;
  }[];
}
interface POSSession {
  id: string;
  staffId: string;
  openedAt: string;
  status: string;
  openingFloat: number;
  totalSales: number;
  totalOrders: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
}

// ─── Session Gate ─────────────────────────────────────────────────────────────
function SessionGate({ onOpen }: { onOpen: (session: POSSession) => void }) {
  const [openingFloat, setOpeningFloat] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { user } = useAuthStore();

  const openSession = async () => {
    setLoading(true);
    try {
      const res = await apiPost<any>("/pos/sessions", {
        openingFloat: parseFloat(openingFloat) || 0,
      });
      onOpen(res.data.session);
      toast("POS session opened", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Open POS Session
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Welcome,{" "}
          <span className="font-semibold text-gray-700">{user?.name}</span>.
          <br />
          Enter your opening cash float to begin.
        </p>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 text-left">
            Opening Float (₦)
          </label>
          <input
            type="number"
            min={0}
            value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            placeholder="e.g. 50000"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-xl font-bold text-center focus:outline-none focus:border-green-500"
            autoFocus
          />
        </div>
        <button
          onClick={openSession}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LogIn className="w-5 h-5" />
          )}
          Open Session
        </button>
      </div>
    </div>
  );
}

// ─── Close Session Modal ──────────────────────────────────────────────────────
function CloseSessionModal({
  session,
  onClose,
  onClosed,
}: {
  session: POSSession;
  onClose: () => void;
  onClosed: () => void;
}) {
  const [closingFloat, setClosingFloat] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const expectedCash = session.openingFloat + session.cashSales;
  const variance = closingFloat
    ? parseFloat(closingFloat) - expectedCash
    : null;

  const closeSession = async () => {
    setLoading(true);
    try {
      await apiPut<any>(`/pos/sessions/${session.id}/close`, {
        closingFloat: parseFloat(closingFloat) || 0,
        notes,
      });
      toast("Session closed successfully", "success");
      onClosed();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg">Close POS Session</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Session summary */}
          <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Total Orders</p>
              <p className="font-bold text-gray-900">{session.totalOrders}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Sales</p>
              <p className="font-bold text-gray-900">
                {formatPrice(session.totalSales)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Cash Sales</p>
              <p className="font-semibold">{formatPrice(session.cashSales)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Card/Transfer</p>
              <p className="font-semibold">
                {formatPrice(session.cardSales + session.transferSales)}
              </p>
            </div>
            <div className="col-span-2 border-t border-gray-200 pt-2">
              <p className="text-xs text-gray-500">Expected Cash in Drawer</p>
              <p className="font-bold text-green-700 text-lg">
                {formatPrice(expectedCash)}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Actual Cash in Drawer (₦)
            </label>
            <input
              type="number"
              min={0}
              value={closingFloat}
              onChange={(e) => setClosingFloat(e.target.value)}
              placeholder={String(Math.round(expectedCash))}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-green-500"
              autoFocus
            />
            {variance !== null && (
              <p
                className={`mt-1 text-xs font-semibold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {variance >= 0
                  ? `Surplus: +${formatPrice(variance)}`
                  : `Shortage: ${formatPrice(Math.abs(variance))}`}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any discrepancies or notes..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none"
            />
          </div>

          <button
            onClick={closeSession}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
            Close Session
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cart Item Row ─────────────────────────────────────────────────────────────
function CartItemRow({
  item,
  onQtyChange,
  onDiscountChange,
  onRemove,
}: {
  item: CartItem;
  onQtyChange: (qty: number) => void;
  onDiscountChange: (d: number) => void;
  onRemove: () => void;
}) {
  const [showDiscount, setShowDiscount] = useState(false);

  // ── Variation (structured preset) line ──────────────────────────────────
  // `variation` may be undefined even when item.variationId is set — e.g.
  // right after resuming a suspended order, the cart is rebuilt from a
  // snapshot that doesn't include the full product.variations array. The
  // line should still render/behave as a variation line using the snapshot
  // (item.variationLabel, item.unitPrice, item.quantity as pack count).
  const variation = item.variationId
    ? item.product.variations?.find((v) => v.id === item.variationId)
    : undefined;
  const isVariationLine = !!item.variationId;

  const variationMax = variation
    ? variation.stockQuantity !== null && variation.stockQuantity !== undefined
      ? variation.stockQuantity
      : item.product.trackInventory
        ? Math.floor((item.product.stockQuantity ?? Infinity) / variation.quantity)
        : Infinity
    : Infinity;

  const isScalable = !!item.product.isScalable;
  const unit = item.product.scaleUnit || "unit";
  const step = item.product.scaleStep ?? 0.1;
  // Preset-only: scaleStep = 0 — no +/- increment on the cashier screen,
  // quantity can only change by tapping one of the preset weight chips.
  const presetOnly = !isVariationLine && isScalable && step === 0;
  const minQty = item.product.minOrderQty || (presetOnly ? 0 : step);
  const maxStock = item.product.trackInventory
    ? (item.product.stockQuantity ?? Infinity)
    : Infinity;
  const maxQty = item.product.maxOrderQty
    ? Math.min(item.product.maxOrderQty, maxStock)
    : maxStock;

  const roundStep = (v: number) =>
    parseFloat((Math.round(v / step) * step).toFixed(10));

  const handleDecrement = () => {
    if (isVariationLine) {
      if (item.quantity <= 1) {
        onRemove();
        return;
      }
      onQtyChange(item.quantity - 1);
      return;
    }
    if (presetOnly) return;
    if (isScalable) {
      const next = roundStep(item.quantity - step);
      if (next < minQty) {
        onRemove();
        return;
      }
      onQtyChange(next);
    } else {
      onQtyChange(item.quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (isVariationLine) {
      if (item.quantity + 1 > variationMax) return;
      onQtyChange(item.quantity + 1);
      return;
    }
    if (presetOnly) return;
    if (isScalable) {
      const next = roundStep(item.quantity + step);
      if (next > maxQty) return;
      onQtyChange(next);
    } else {
      onQtyChange(item.quantity + 1);
    }
  };

  const atMin = isVariationLine
    ? item.quantity <= 1
    : presetOnly
      ? true
      : isScalable
        ? item.quantity <= minQty
        : item.quantity <= 1;
  const atMax = isVariationLine
    ? item.quantity >= variationMax
    : presetOnly
      ? true
      : isScalable
        ? item.quantity >= maxQty
        : item.product.trackInventory &&
          item.quantity >= (item.product.stockQuantity ?? Infinity);

  const qtyDisplay = isVariationLine
    ? `×${item.quantity}`
    : isScalable
      ? item.quantity % 1 === 0
        ? `${item.quantity.toFixed(0)} ${unit}`
        : `${item.quantity.toFixed(1)} ${unit}`
      : String(item.quantity);

  const lineTotal = item.unitPrice * item.quantity * (1 - item.discount / 100);

  return (
    <div className="px-4 py-3 hover:bg-gray-50">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 line-clamp-1">
            {item.product.name}
          </p>
          {isVariationLine ? (
            <p className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 inline-block px-1 rounded mt-0.5">
              {item.variationLabel || variation?.label}
            </p>
          ) : (
            <p className="text-[10px] text-gray-400">
              {item.product.sku}
              {item.product.netWeight && ` · ${item.product.netWeight}`}
            </p>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-gray-600">
              {isVariationLine
                ? `${formatPrice(item.unitPrice)}/pack`
                : isScalable
                  ? `${formatPrice(item.unitPrice)}/${unit}`
                  : formatPrice(item.unitPrice)}
            </span>
            {item.discount > 0 && (
              <span className="text-[10px] text-green-700 bg-green-100 px-1 rounded">
                -{item.discount}%
              </span>
            )}
          </div>
        </div>

        {/* Quantity / amount control */}
        <div className="flex flex-col items-center gap-1">
          {/* Scalable presets row (legacy raw-number presets only) */}
          {!isVariationLine &&
            isScalable &&
            (item.product.scalePresets?.length ?? 0) > 0 && (
              <div className="flex gap-1 flex-wrap justify-end max-w-[120px]">
                {(item.product.scalePresets || []).slice(0, 4).map((p) => (
                  <button
                    key={p}
                    onClick={() => onQtyChange(p)}
                    className={`text-[8px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                      item.quantity === p
                        ? "bg-green-600 text-white border-green-600"
                        : "border-gray-300 text-gray-600 hover:border-green-500"
                    }`}
                  >
                    {p}
                    {unit}
                  </button>
                ))}
              </div>
            )}

          {presetOnly ? (
            // No +/- increment in preset-only mode — quantity can only be
            // changed by tapping a different preset chip above, or removed.
            <span className="text-center text-xs font-bold w-14 px-1 py-1 border border-gray-200 rounded bg-gray-50">
              {qtyDisplay}
            </span>
          ) : (
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <button
                onClick={handleDecrement}
                className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <span
                className={`text-center text-xs font-bold ${isScalable || isVariationLine ? "w-14 px-1" : "w-7"}`}
              >
                {qtyDisplay}
              </span>
              <button
                onClick={handleIncrement}
                disabled={!!atMax}
                className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title={
                  atMax
                    ? isVariationLine
                      ? `Max ${variationMax} pack(s) reached`
                      : `Max ${isScalable ? `${maxQty} ${unit}` : `stock (${item.product.stockQuantity})`} reached`
                    : undefined
                }
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>

        <div className="text-right w-16 flex-shrink-0">
          <p className="text-xs font-bold text-gray-900">
            {formatPrice(lineTotal)}
          </p>
        </div>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => setShowDiscount(!showDiscount)}
            className="text-gray-400 hover:text-amber-500"
          >
            <Tag className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {showDiscount && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-500">Item discount %:</span>
          <input
            type="number"
            min={0}
            max={100}
            value={item.discount || ""}
            onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
            className="w-16 border border-gray-300 px-2 py-1 text-xs rounded focus:outline-none focus:border-green-400"
            placeholder="0"
          />
        </div>
      )}
    </div>
  );
}

// ── POSProductGrid ─────────────────────────────────────────────────────────────
// ✅ FIX 3: Touch-friendly visual product grid for busy POS environments.
// Cashiers can tap a product image to instantly add it to the cart instead
// of typing. A green badge shows the current quantity in cart; "Out" badge
// shows when stock is zero. Category pills at the top filter the grid.

interface POSProductGridProps {
  products: Product[];
  categories: { id: string; name: string }[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  loading: boolean;
  onAddToCart: (
    product: Product,
    presetQty?: number,
    variation?: ProductVariation,
  ) => void;
  cart: CartItem[];
  // Live checkout scale — when connected, tapping a weigh-eligible product
  // (loose, sold by kg/g, no pre-packaged variations) opens the weigh
  // modal instead of adding a default quantity.
  isScaleConnected: boolean;
  isWeighEligible: (product: Product) => boolean;
  onWeighProduct: (product: Product) => void;
}

function POSProductGrid({
  products,
  categories,
  selectedCategory,
  onCategoryChange,
  loading,
  onAddToCart,
  cart,
  isScaleConnected,
  isWeighEligible,
  onWeighProduct,
}: POSProductGridProps) {
  // Preset-only products (scaleStep = 0) can't be added with a default
  // quantity — tapping the tile opens this inline picker so the cashier
  // must explicitly choose one of the preset weights.
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Category filter pills */}
      <div className="flex gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50 overflow-x-auto flex-shrink-0 scrollbar-none">
        <button
          onClick={() => onCategoryChange("")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            selectedCategory === ""
              ? "bg-green-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              selectedCategory === cat.id
                ? "bg-green-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Package className="w-12 h-12 mb-3 text-gray-200" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {products.map((product) => {
              const inCart = cart.filter((i) => i.product.id === product.id);
              const inCartQty = inCart.reduce((s, i) => s + i.quantity, 0);
              const outOfStock = product.stockQuantity <= 0;
              const activeVariations = (product.variations || []).filter(
                (v) => v.isActive,
              );
              const hasVariations = activeVariations.length > 0;
              const presetOnly =
                !hasVariations &&
                !!product.isScalable &&
                (product.scaleStep ?? 0.1) === 0;
              return (
                <button
                  key={product.id}
                  onClick={() => {
                    if (outOfStock) return;
                    if (hasVariations || presetOnly) {
                      setPickerProduct(product);
                    } else if (isScaleConnected && isWeighEligible(product)) {
                      onWeighProduct(product);
                    } else {
                      onAddToCart(product);
                    }
                  }}
                  disabled={outOfStock}
                  className={`relative flex flex-col rounded-xl border-2 overflow-hidden transition-all active:scale-95 text-left ${
                    outOfStock
                      ? "border-gray-100 opacity-50 cursor-not-allowed bg-gray-50"
                      : inCart.length > 0
                        ? "border-green-500 bg-green-50 shadow-md"
                        : "border-gray-200 bg-white hover:border-green-400 hover:shadow-sm"
                  }`}
                >
                  {/* Product image */}
                  <div className="aspect-square w-full bg-gray-100 overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Cart quantity badge */}
                  {inCart.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-green-600 text-white text-[10px] font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center shadow leading-none">
                      {hasVariations
                        ? `×${inCartQty}`
                        : product.isScalable
                          ? `${inCartQty % 1 === 0 ? inCartQty.toFixed(0) : inCartQty.toFixed(1)}${product.scaleUnit ? product.scaleUnit[0] : ""}`
                          : inCartQty}
                    </span>
                  )}

                  {/* Out of stock badge */}
                  {outOfStock && (
                    <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Out
                    </span>
                  )}

                  {/* Variation / scalable badge */}
                  {!outOfStock && hasVariations && (
                    <span className="absolute top-1.5 left-1.5 bg-emerald-700 text-white text-[8px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                      {activeVariations.length} option
                      {activeVariations.length === 1 ? "" : "s"}
                    </span>
                  )}
                  {!outOfStock && !hasVariations && product.isScalable && (
                    <span className="absolute top-1.5 left-1.5 bg-green-700 text-white text-[8px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                      ⚖ {product.scaleUnit || "unit"}
                      {isScaleConnected && isWeighEligible(product) && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-lime-300 animate-pulse ml-0.5"
                          title="Live scale ready"
                        />
                      )}
                    </span>
                  )}

                  {/* Product info */}
                  <div className="p-1.5">
                    <p className="text-[11px] font-semibold text-gray-900 line-clamp-2 leading-tight">
                      {product.name}
                    </p>
                    <p className="text-[11px] font-bold text-green-700 mt-0.5">
                      {hasVariations
                        ? `From ${formatPrice(
                            Math.min(...activeVariations.map((v) => v.price)),
                          )}`
                        : product.isScalable && product.pricePerUnit
                          ? `${formatPrice(product.pricePerUnit)}/${product.scaleUnit || "unit"}`
                          : formatPrice(product.price)}
                    </p>
                    <p className="text-[9px] text-gray-400">
                      {hasVariations
                        ? "Tap to choose an option"
                        : product.isScalable
                          ? `${product.stockQuantity} ${product.scaleUnit || "unit"} left`
                          : `Qty: ${product.stockQuantity}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Option picker — shown when a product has structured variations
          (labeled presets like "500g Pack") or is a legacy preset-only
          (scaleStep = 0) scalable product. No default quantity is added;
          the cashier must explicitly choose an option. */}
      {pickerProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={() => setPickerProduct(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-gray-900 line-clamp-2">
              {pickerProduct.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">
              Select an option to add it to the sale.
            </p>
            {(pickerProduct.variations || []).filter((v) => v.isActive)
              .length > 0 ? (
              <div className="flex flex-col gap-2">
                {(pickerProduct.variations || [])
                  .filter((v) => v.isActive)
                  .map((v) => {
                    const dedicated =
                      v.stockQuantity !== null && v.stockQuantity !== undefined;
                    const available = dedicated
                      ? (v.stockQuantity as number)
                      : pickerProduct.trackInventory
                        ? Math.floor(
                            (pickerProduct.stockQuantity ?? Infinity) /
                              v.quantity,
                          )
                        : Infinity;
                    const soldOut = available <= 0;
                    return (
                      <button
                        key={v.id}
                        disabled={soldOut}
                        onClick={() => {
                          onAddToCart(pickerProduct, undefined, v);
                          setPickerProduct(null);
                        }}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${
                          soldOut
                            ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                            : "border-gray-200 hover:border-green-500 hover:bg-green-50"
                        }`}
                      >
                        <span>
                          <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                            {v.label}
                            {v.isDefault && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                                DEFAULT
                              </span>
                            )}
                          </span>
                          <span className="block text-[11px] text-gray-400 mt-0.5">
                            {soldOut
                              ? "Out of stock"
                              : Number.isFinite(available)
                                ? `${available} available`
                                : "In stock"}
                          </span>
                        </span>
                        <span className="text-sm font-bold text-green-700">
                          {formatPrice(v.price)}
                        </span>
                      </button>
                    );
                  })}
              </div>
            ) : (pickerProduct.scalePresets || []).length === 0 ? (
              <p className="text-xs text-red-500">
                No preset weights are configured for this product. Contact an
                admin to add some in Product Settings.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(pickerProduct.scalePresets || []).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      onAddToCart(pickerProduct, p);
                      setPickerProduct(null);
                    }}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:border-green-500 hover:bg-green-50 transition-colors"
                  >
                    {p} {pickerProduct.scaleUnit || "unit"}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setPickerProduct(null)}
              className="mt-4 w-full py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function POSPage() {
  return (
    <ScaleProvider>
      <POSPageInner />
    </ScaleProvider>
  );
}

function POSPageInner() {
  const { user } = useAuthStore();
  const scale = useScale();
  const toast = useToast();

  // Session state
  const [session, setSession] = useState<POSSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [showCloseSession, setShowCloseSession] = useState(false);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  // Mirrors POSProductGrid's pickerProduct — the search bar and barcode
  // scanner are a separate render tree from the Quick-Add Grid, so they need
  // their own picker state to prompt for an option/preset instead of
  // silently falling through to the continuous-scale "₦/kg" default.
  const [searchPickerProduct, setSearchPickerProduct] = useState<Product | null>(null);
  // Product currently being weighed on the connected checkout scale (loose
  // items sold by weight — see the "Live weighing" section below).
  const [weighProduct, setWeighProduct] = useState<Product | null>(null);

  // Customer — "WALK_IN" is the generic walking customer option
  const [customerType, setCustomerType] = useState<"WALK_IN" | "NAMED">(
    "WALK_IN",
  );
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Discount
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [showDiscountPanel, setShowDiscountPanel] = useState(false);

  // Payment
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountTendered, setAmountTendered] = useState("");
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([
    { method: "CASH", amount: 0 },
    { method: "CARD", amount: 0 },
  ]);
  const [processing, setProcessing] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");

  // Receipt
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(
    null,
  );
  const [showReceipt, setShowReceipt] = useState(false);

  // Suspend / Resume
  const [suspendedOrders, setSuspendedOrders] = useState<SuspendedOrder[]>([]);
  const [showSuspendPanel, setShowSuspendPanel] = useState(false);
  const [suspendLabel, setSuspendLabel] = useState("");
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [resuming, setResuming] = useState<string | null>(null); // orderId being resumed
  // The DB id of the currently-active suspended order (set when we resume one)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // ✅ FIX 3: Visual product grid state
  const [productGridMode, setProductGridMode] = useState<"search" | "grid">(
    "search",
  );
  const [gridProducts, setGridProducts] = useState<Product[]>([]);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridCategory, setGridCategory] = useState("");
  const [gridCategories, setGridCategories] = useState<
    { id: string; name: string }[]
  >([]);

  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // ── Camera barcode scanner state ──────────────────────────────────────────
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);

  // ✅ FIX 3: Load products + categories when grid mode is activated
  useEffect(() => {
    if (productGridMode !== "grid") return;
    const fetchGrid = async () => {
      setGridLoading(true);
      try {
        const params: any = { status: "ACTIVE", limit: 48 };
        if (gridCategory) params.categoryId = gridCategory;
        const [prodRes, catRes] = await Promise.all([
          apiGet<any>(`/products`, params),
          apiGet<any>(`/categories`),
        ]);
        setGridProducts(prodRes.data.products || []);
        setGridCategories(catRes.data.categories || []);
      } catch {
      } finally {
        setGridLoading(false);
      }
    };
    fetchGrid();
  }, [productGridMode, gridCategory]);

  // Load existing open session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await apiGet<any>("/pos/sessions?limit=1");
        const sessions: POSSession[] = res.data.sessions || [];
        const open = sessions.find((s) => s.status === "OPEN");
        setSession(open || null);
      } catch {
        setSession(null);
      } finally {
        setSessionLoading(false);
      }
    };
    checkSession();
  }, []);

  // Fetch suspended orders whenever the session is active
  const fetchSuspendedOrders = async () => {
    try {
      const res = await apiGet<any>("/pos/orders/suspended");
      setSuspendedOrders(res.data.orders || []);
    } catch {
      // silently ignore — suspended list is best-effort
    }
  };
  useEffect(() => {
    if (session) fetchSuspendedOrders();
  }, [session]);

  // ── Calculations ──
  const subtotal = cart.reduce(
    (s, i) => s + i.unitPrice * i.quantity * (1 - i.discount / 100),
    0,
  );
  const couponDiscount = (() => {
    if (!appliedDiscount) return 0;
    if (appliedDiscount.type === "PERCENTAGE") {
      const pct = (subtotal * appliedDiscount.value) / 100;
      return appliedDiscount.maxDiscount
        ? Math.min(pct, appliedDiscount.maxDiscount)
        : pct;
    }
    if (appliedDiscount.type === "FIXED_AMOUNT")
      return Math.min(appliedDiscount.value, subtotal);
    return 0;
  })();
  const totalDiscount = couponDiscount + manualDiscount;
  const total = Math.max(0, subtotal - totalDiscount);
  const change =
    paymentMethod === "CASH" && amountTendered
      ? Math.max(0, parseFloat(amountTendered || "0") - total)
      : 0;
  const splitTotal = splitPayments.reduce((s, p) => s + p.amount, 0);
  const splitRemaining = total - splitTotal;

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await apiGet<any>(
        `/products?search=${encodeURIComponent(q)}&status=ACTIVE&limit=10`,
      );
      setSearchResults(res.data.products || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, handleSearch]);

  const handleBarcode = async (code: string) => {
    if (!code.trim()) return;
    try {
      const res = await apiGet<any>(
        `/products?barcode=${encodeURIComponent(code)}&status=ACTIVE&limit=1`,
      );
      const products = res.data.products || [];
      if (products.length > 0) {
        const product = products[0];
        // The scan can match either the product's own barcode or a
        // specific variation's dedicated barcode (e.g. a pre-labeled
        // "500g Pack" sticker) — route straight to that preset.
        const matchedVariation =
          product.barcode === code
            ? undefined
            : (product.variations || []).find((v: ProductVariation) => v.barcode === code);
        addOrPickVariation(product, matchedVariation);
        if (barcodeRef.current) barcodeRef.current.value = "";
      } else toast(`No product for barcode: ${code}`, "error");
    } catch {
      toast("Barcode lookup failed", "error");
    }
  };

  // ── Camera scanner: start ZXing multi-format reader on the video element ──
  const stopCameraScanner = () => {
    if (scannerControlsRef.current) {
      try {
        scannerControlsRef.current.stop();
      } catch {}
      scannerControlsRef.current = null;
    }
    // Stop all camera tracks
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setShowCameraScanner(false);
  };

  const startCameraScanner = async () => {
    setShowCameraScanner(true);
    // Dynamically import ZXing so it doesn't bloat initial bundle
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();

      // Wait a tick for the video element to mount
      await new Promise((r) => setTimeout(r, 200));
      if (!videoRef.current) return;

      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current,
        (result, error) => {
          if (result) {
            const code = result.getText();
            stopCameraScanner();
            handleBarcode(code);
          }
          // Suppress frame-by-frame "not found" errors — they are normal
          if (error && !error.message?.includes("No MultiFormat")) {
            // silent
          }
        },
      );
      scannerControlsRef.current = controls;
    } catch (err: any) {
      toast(
        err?.message?.includes("Permission")
          ? "Camera permission denied. Please allow camera access."
          : "Could not start camera scanner.",
        "error",
      );
      setShowCameraScanner(false);
    }
  };

  const addToCart = (
    product: Product,
    presetQty?: number,
    variation?: ProductVariation,
  ) => {
    // ── Structured preset/variation (e.g. "500g Pack") ────────────────────
    if (variation) {
      const dedicated =
        variation.stockQuantity !== null && variation.stockQuantity !== undefined;
      const maxPacks = dedicated
        ? (variation.stockQuantity as number)
        : product.trackInventory
          ? Math.floor((product.stockQuantity ?? Infinity) / variation.quantity)
          : Infinity;

      setCart((prev) => {
        const existing = prev.find(
          (i) => i.product.id === product.id && i.variationId === variation.id,
        );
        if (existing) {
          if (existing.quantity + 1 > maxPacks) return prev;
          return prev.map((i) =>
            i === existing ? { ...i, quantity: i.quantity + 1 } : i,
          );
        }
        if (maxPacks < 1) return prev;
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice: variation.price,
            discount: 0,
            variationId: variation.id,
            variationLabel: variation.label,
          },
        ];
      });
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      return;
    }

    const isScalable = !!product.isScalable;
    const step = product.scaleStep ?? 0.1;
    // Preset-only: scaleStep = 0 — there's no default increment quantity,
    // the cashier must have tapped an explicit preset weight (the grid
    // routes these through the preset picker before ever calling this
    // with presetQty set).
    const presetOnly = isScalable && step === 0;
    if (presetOnly && presetQty === undefined) {
      toast(`Select a preset weight for ${product.name}`, "error");
      return;
    }

    const unitPrice =
      isScalable && product.pricePerUnit ? product.pricePerUnit : product.price;
    const startQty = presetQty ?? (isScalable ? product.minOrderQty || step : 1);

    setCart((prev) => {
      const existing = prev.find(
        (i) => i.product.id === product.id && !i.variationId,
      );
      if (existing) {
        if (isScalable) {
          const maxQty = product.maxOrderQty
            ? Math.min(
                product.maxOrderQty,
                product.trackInventory ? product.stockQuantity : Infinity,
              )
            : product.trackInventory
              ? product.stockQuantity
              : Infinity;
          const next = presetOnly
            ? parseFloat((existing.quantity + (presetQty as number)).toFixed(10))
            : parseFloat(
                (Math.round((existing.quantity + step) / step) * step).toFixed(10),
              );
          if (next > maxQty) return prev;
          return prev.map((i) =>
            i === existing ? { ...i, quantity: next } : i,
          );
        } else {
          const maxQty = product.trackInventory
            ? (product.stockQuantity ?? Infinity)
            : Infinity;
          if (existing.quantity >= maxQty) return prev;
          return prev.map((i) =>
            i === existing ? { ...i, quantity: i.quantity + 1 } : i,
          );
        }
      }
      return [...prev, { product, quantity: startQty, unitPrice, discount: 0 }];
    });

    // Warn if at stock limit (fixed products)
    if (!isScalable) {
      const inCart = cart.find((i) => i.product.id === product.id);
      if (
        inCart &&
        product.trackInventory &&
        inCart.quantity >= (product.stockQuantity ?? Infinity)
      ) {
        toast(`Stock limit reached for ${product.name}`, "error");
      }
    }

    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  // ── Live weighing (checkout scale) ──────────────────────────────────────
  // Only loose products actually sold in a mass unit the physical scale can
  // read (kg/g) go through the "put it on the scale" flow. Pre-packaged
  // variations (e.g. "500g Pack") and volume/count-based scalable products
  // (L, cup, custom) keep their existing picker/step behaviour untouched.
  const isWeighEligible = (product: Product) => {
    const activeVariations = (product.variations || []).filter((v) => v.isActive);
    if (activeVariations.length > 0) return false;
    if (!product.isScalable) return false;
    if ((product.scaleStep ?? 0.1) === 0) return false; // preset-only
    return product.scaleUnit === "kg" || product.scaleUnit === "g";
  };

  // Reads the live, stable weight off the connected scale and adds/merges
  // it into the cart line for this product (summed with any existing
  // weighed quantity for the same product, matching how the rest of the
  // cart already treats one line per product).
  const addWeighedToCart = (product: Product, weightKg: number) => {
    const quantityInScaleUnit =
      product.scaleUnit === "g" ? weightKg * 1000 : weightKg;
    const step = product.scaleStep ?? 0.1;
    const rounded = parseFloat(
      (Math.round(quantityInScaleUnit / step) * step).toFixed(10),
    );
    const unit = product.scaleUnit || "unit";
    const minQty = product.minOrderQty || step;
    if (rounded < minQty) {
      toast(`Weight is below the minimum sale of ${minQty} ${unit}`, "error");
      return;
    }
    const unitPrice =
      product.isScalable && product.pricePerUnit ? product.pricePerUnit : product.price;
    const maxStock = product.trackInventory ? (product.stockQuantity ?? Infinity) : Infinity;
    const maxQty = product.maxOrderQty ? Math.min(product.maxOrderQty, maxStock) : maxStock;

    let added = false;
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id && !i.variationId);
      if (existing) {
        const next = parseFloat((existing.quantity + rounded).toFixed(10));
        if (next > maxQty) {
          toast(`Only ${maxQty} ${unit} available for ${product.name}`, "error");
          return prev;
        }
        added = true;
        return prev.map((i) => (i === existing ? { ...i, quantity: next } : i));
      }
      if (rounded > maxQty) {
        toast(`Only ${maxQty} ${unit} available for ${product.name}`, "error");
        return prev;
      }
      added = true;
      return [...prev, { product, quantity: rounded, unitPrice, discount: 0 }];
    });
    if (added) {
      toast(`Added ${rounded} ${unit} of ${product.name} from the scale`, "success");
      setWeighProduct(null);
    }
  };

  // Used by both the search-results dropdown and barcode scan: a product
  // with structured variations (or a legacy preset-only scalable product)
  // can't be added with a single click — which option/weight it is has to
  // be chosen first. `matchedVariation` is already resolved when a scan hit
  // a specific preset's own barcode, so that case skips the picker.
  const addOrPickVariation = (product: Product, matchedVariation?: ProductVariation) => {
    if (matchedVariation) {
      addToCart(product, undefined, matchedVariation);
      return;
    }
    const activeVariations = (product.variations || []).filter((v) => v.isActive);
    const hasVariations = activeVariations.length > 0;
    const presetOnly =
      !hasVariations && !!product.isScalable && (product.scaleStep ?? 0.1) === 0;
    if (hasVariations || presetOnly) {
      setSearchPickerProduct(product);
      setShowSearch(false);
      return;
    }
    if (isWeighEligible(product) && scale.status === "connected") {
      setWeighProduct(product);
      setShowSearch(false);
      return;
    }
    addToCart(product);
  };

  const updateQty = (productId: string, qty: number, variationId?: string) => {
    if (qty <= 0) {
      setCart((p) =>
        p.filter(
          (i) => !(i.product.id === productId && (i.variationId ?? undefined) === variationId),
        ),
      );
      return;
    }
    setCart((p) =>
      p.map((i) =>
        i.product.id === productId && (i.variationId ?? undefined) === variationId
          ? { ...i, quantity: qty }
          : i,
      ),
    );
  };

  const updateItemDiscount = (
    productId: string,
    pct: number,
    variationId?: string,
  ) => {
    setCart((p) =>
      p.map((i) =>
        i.product.id === productId && (i.variationId ?? undefined) === variationId
          ? { ...i, discount: Math.min(100, Math.max(0, pct)) }
          : i,
      ),
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedDiscount(null);
    setCouponCode("");
    setManualDiscount(0);
    setCustomerName("");
    setCustomerPhone("");
    setAmountTendered("");
    setPaymentRef("");
    setShowPayment(false);
    setShowDiscountPanel(false);
    setCustomerType("WALK_IN");
    setActiveOrderId(null);
  };

  // ── Suspend current transaction ──────────────────────────────────────────
  const handleSuspend = async () => {
    if (cart.length === 0) {
      toast("Cart is empty — nothing to suspend.", "error");
      return;
    }
    setSuspending(true);
    try {
      // Use the dedicated /hold endpoint which saves as SUSPENDED without
      // touching stock (stock is only deducted when the order is completed).
      const holdData = {
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          productSku: item.product.sku,
          barcode: item.product.barcode,
          netWeight: item.product.netWeight,
          scaleUnit: item.product.isScalable
            ? (item.product.scaleUnit ?? null)
            : null,
          variationId: item.variationId,
          variationLabel: item.variationLabel,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.unitPrice * item.quantity * (1 - item.discount / 100),
          discountApplied: item.discount,
        })),
        subtotal,
        discountAmount: totalDiscount,
        discountCode: appliedDiscount?.code,
        total,
        customerName:
          customerType === "WALK_IN"
            ? "Walk-In Customer"
            : customerName || undefined,
        customerPhone:
          customerType === "WALK_IN" ? undefined : customerPhone || undefined,
        label: suspendLabel.trim() || undefined,
      };

      await apiPost<any>("/pos/orders/hold", holdData);

      toast("Transaction held. Serve the next customer!", "success");
      setShowSuspendDialog(false);
      setSuspendLabel("");
      clearCart();
      fetchSuspendedOrders();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSuspending(false);
    }
  };

  // ── Resume a suspended transaction ───────────────────────────────────────
  const handleResume = async (order: SuspendedOrder) => {
    if (cart.length > 0) {
      toast(
        "Please suspend or clear the current cart before resuming another transaction.",
        "error",
      );
      return;
    }
    setResuming(order.id);
    try {
      await apiPut<any>(`/pos/orders/${order.id}/resume`, {});

      // Rebuild cart from the suspended order items
      const rebuiltCart: CartItem[] = order.items.map((item) => ({
        product: {
          id: item.productId,
          name: item.productName,
          sku: item.productSku,
          barcode: item.barcode ?? undefined,
          price: item.unitPrice,
          stockQuantity: 9999, // actual stock validated server-side on resume
          images: [],
          trackInventory: false,
          netWeight: item.netWeight ?? undefined,
          isScalable: !!item.scaleUnit,
          scaleUnit: item.scaleUnit ?? undefined,
          pricePerUnit: item.scaleUnit ? item.unitPrice : undefined,
        } as Product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discountApplied,
        variationId: item.variationId ?? undefined,
        variationLabel: item.variationLabel ?? undefined,
      }));

      setCart(rebuiltCart);
      setActiveOrderId(order.id);
      if (order.customerName && order.customerName !== "Walk-In Customer") {
        setCustomerType("NAMED");
        setCustomerName(order.customerName);
      }

      setSuspendedOrders((prev) => prev.filter((o) => o.id !== order.id));
      setShowSuspendPanel(false);
      toast(`Resumed: ${order.posOrderNumber}`, "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setResuming(null);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await apiPost<any>("/discounts/validate", {
        code: couponCode.trim().toUpperCase(),
        orderAmount: subtotal,
      });
      if (res.data.valid) {
        setAppliedDiscount(res.data.discount);
        toast("Coupon applied!", "success");
      } else toast(res.data.message || "Invalid coupon", "error");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setCouponLoading(false);
    }
  };

  // ── Print receipt from checkout modal using iframe (avoids printing full page) ──
  // NOTE: We use a Blob URL assigned to `iframe.src` rather than
  // `doc.write()`. With doc.write, the iframe's `load` event has typically
  // already fired (for the initial about:blank doc) by the time `onload` is
  // attached — it "works" on the very first print of a page session by luck,
  // but `onload` never re-fires on subsequent prints, so nothing happens.
  // A Blob URL reliably fires `load` every time.
  const printCurrentReceipt = () => {
    const el = document.getElementById("receipt-content");
    if (!el) return;

    const existing = document.getElementById("pos-receipt-print-frame");
    if (existing) existing.remove();

    const html = `
      <!DOCTYPE html><html><head>
      <style>
        @page { size: 80mm auto; margin: 0; }
        * { box-sizing: border-box; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 12px;
               width: 72mm; margin: 0 auto; padding: 4mm 2mm; line-height: 1.5;
               color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .text-center, .center { text-align: center; }
        .font-bold, .bold, b, strong { font-weight: 900; }
        .text-gray-400, .text-gray-500, .text-gray-600 { color: #000; }
        .border-t { border-top: 1px dashed #000; margin: 3mm 0; }
        .border-dashed { border-style: dashed; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .space-y-1 > * { margin-bottom: 1mm; }
        .text-base { font-size: 13px; font-weight: 700; }
        .text-2xl, .text-xl { font-size: 15px; font-weight: 900; }
        .text-xs { font-size: 11px; }
        .text-\\[10px\\] { font-size: 10px; }
        .my-2, .mb-3, .mt-3 { margin: 2mm 0; }
        .pt-1, .pt-2 { padding-top: 1mm; }
        * { letter-spacing: 0.01em; }
      </style>
      </head><body>${el.innerHTML}</body></html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement("iframe");
    iframe.id = "pos-receipt-print-frame";
    iframe.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:80mm;height:297mm;border:none;";

    const cleanup = () => {
      try {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch (_) {
        /* ignore */
      }
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (_) {
        /* ignore */
      }
    };

    iframe.onload = () => {
      setTimeout(() => {
        const win = iframe.contentWindow;
        if (!win) {
          cleanup();
          return;
        }
        win.focus();
        win.addEventListener("afterprint", cleanup, { once: true });
        win.print();
        setTimeout(cleanup, 30_000);
      }, 300);
    };

    iframe.src = blobUrl;
    document.body.appendChild(iframe);
  };

  const processPayment = async () => {
    if (cart.length === 0) {
      toast("Cart is empty", "error");
      return;
    }
    if (!session) {
      toast("No open session. Please open a session first.", "error");
      return;
    }

    if (paymentMethod === "CASH") {
      if (parseFloat(amountTendered || "0") < total) {
        toast(`Need ${formatPrice(total)}`, "error");
        return;
      }
    }
    if (paymentMethod === "SPLIT" && splitRemaining > 0.01) {
      toast(`Split is short by ${formatPrice(splitRemaining)}`, "error");
      return;
    }

    setProcessing(true);
    try {
      const orderData = {
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          productSku: item.product.sku,
          barcode: item.product.barcode,
          netWeight: item.product.netWeight,
          scaleUnit: item.product.isScalable
            ? (item.product.scaleUnit ?? null)
            : null,
          variationId: item.variationId,
          variationLabel: item.variationLabel,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.unitPrice * item.quantity * (1 - item.discount / 100),
          discountApplied: item.discount,
        })),
        subtotal,
        discountAmount: totalDiscount,
        discountCode: appliedDiscount?.code,
        total,
        paymentMethod,
        amountTendered:
          paymentMethod === "CASH" ? parseFloat(amountTendered) : undefined,
        changeGiven: paymentMethod === "CASH" ? change : undefined,
        splitPayments: paymentMethod === "SPLIT" ? splitPayments : undefined,
        paymentReference: paymentRef || undefined,
        // Walking customer uses generic label; named customer uses entered name
        customerName:
          customerType === "WALK_IN"
            ? "Walk-In Customer"
            : customerName || undefined,
        customerPhone:
          customerType === "WALK_IN" ? undefined : customerPhone || undefined,
        sessionId: session.id,
      };

      // If this cart was resumed from a hold, void the draft hold order first
      // (it never deducted stock, so void is safe and purely a status cleanup)
      if (activeOrderId) {
        try {
          await apiPut<any>(`/pos/orders/${activeOrderId}/void`, {
            reason: "Completed via resume — replaced by new order",
          });
        } catch {
          // Non-fatal: proceed even if the void fails
        }
      }

      const res = await apiPost<any>("/pos/orders", orderData);
      const order = res.data.order;

      setCompletedOrder({
        posOrderNumber: order.posOrderNumber,
        items: cart,
        subtotal,
        discountAmount: totalDiscount,
        total,
        paymentMethod,
        amountTendered:
          paymentMethod === "CASH" ? parseFloat(amountTendered) : undefined,
        changeGiven: paymentMethod === "CASH" ? change : undefined,
        splitPayments: paymentMethod === "SPLIT" ? splitPayments : undefined,
        customerName:
          customerType === "WALK_IN"
            ? "Walk-In Customer"
            : customerName || undefined,
        customerPhone: customerType === "NAMED" ? customerPhone : undefined,
        processedAt: new Date(),
        receiptNumber: order.receiptNumber || order.posOrderNumber,
      });

      // Update local session stats
      setSession((prev) =>
        prev
          ? {
              ...prev,
              totalOrders: prev.totalOrders + 1,
              totalSales: prev.totalSales + total,
              cashSales:
                prev.cashSales + (paymentMethod === "CASH" ? total : 0),
              cardSales:
                prev.cardSales + (paymentMethod === "CARD" ? total : 0),
              transferSales:
                prev.transferSales + (paymentMethod === "TRANSFER" ? total : 0),
            }
          : prev,
      );

      setShowReceipt(true);
      setShowPayment(false);
      clearCart();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setProcessing(false);
    }
  };

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 20000].filter(
    (a) => a >= total,
  );

  if (sessionLoading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-400" />
      </div>
    );
  }

  if (!session) {
    return <SessionGate onOpen={(s) => setSession(s)} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-5 h-5 text-green-400" />
          <span className="font-bold text-sm">NigitTriple POS</span>
          {user && <span className="text-gray-400 text-xs">| {user.name}</span>}
          <span className="bg-green-800 text-green-200 text-[10px] px-2 py-0.5 rounded-full">
            Session Open
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-gray-300">
            <span className="text-green-400 font-bold">
              {session.totalOrders}
            </span>{" "}
            orders
            {" | "}
            <span className="text-green-400 font-bold">
              {formatPrice(session.totalSales)}
            </span>
          </div>
          <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date().toLocaleTimeString("en-NG", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          {/* Checkout scale connect/status button */}
          <ScalePanel />
          {/* Held transactions quick-access button */}
          <button
            onClick={() => {
              fetchSuspendedOrders();
              setShowSuspendPanel(true);
            }}
            className={`relative px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${suspendedOrders.length > 0 ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"}`}
            title="View held transactions"
          >
            <PauseCircle className="w-3 h-3" /> Held
            {suspendedOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {suspendedOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowCloseSession(true)}
            className="bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1"
          >
            <LogOut className="w-3 h-3" /> Close Session
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT: Product Search + Visual Grid ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white border-r border-gray-200 relative">
          {/* ✅ FIX 3: Tab toggle — Search/Scan vs Quick-Add Grid */}
          <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors ${
                productGridMode === "search"
                  ? "bg-white border-b-2 border-green-600 text-green-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setProductGridMode("search")}
            >
              <LayoutList className="w-3.5 h-3.5" /> Search / Scan
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors ${
                productGridMode === "grid"
                  ? "bg-white border-b-2 border-green-600 text-green-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setProductGridMode("grid")}
            >
              <Grid3x3 className="w-3.5 h-3.5" /> Quick-Add Grid
            </button>
          </div>

          {/* ── SEARCH MODE ── */}
          {productGridMode === "search" && (
            <>
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={searchRef}
                      type="text"
                      placeholder="Search product by name or SKU..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSearch(true);
                      }}
                      onFocus={() => setShowSearch(true)}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 text-sm focus:outline-none focus:border-green-500 rounded bg-white"
                    />
                    {searchLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  <div className="relative">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={barcodeRef}
                      type="text"
                      placeholder="Scan barcode"
                      className="pl-9 pr-4 py-2.5 border border-gray-300 text-sm focus:outline-none focus:border-amber-500 rounded bg-white w-40"
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleBarcode(e.currentTarget.value);
                      }}
                    />
                  </div>
                  {/* Camera scan button */}
                  <button
                    onClick={startCameraScanner}
                    title="Scan with camera"
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="hidden sm:inline">Camera</span>
                  </button>
                </div>

                {/* Search results dropdown */}
                {showSearch && searchResults.length > 0 && (
                  <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-64 overflow-y-auto w-[calc(100%-2rem)]">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addOrPickVariation(product)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 text-left border-b border-gray-100 last:border-0"
                      >
                        <div className="w-8 h-8 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                          {product.images?.[0] && (
                            <img
                              src={product.images[0]}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {product.sku}
                            {product.netWeight && ` · ${product.netWeight}`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold">
                            {(product.variations || []).filter((v) => v.isActive).length > 0
                              ? `From ${formatPrice(
                                  Math.min(
                                    ...(product.variations || [])
                                      .filter((v) => v.isActive)
                                      .map((v) => v.price),
                                  ),
                                )}`
                              : product.isScalable && product.pricePerUnit
                                ? `${formatPrice(product.pricePerUnit)}/${product.scaleUnit || "unit"}`
                                : formatPrice(product.price)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {(product.variations || []).filter((v) => v.isActive).length > 0
                              ? "Tap to choose"
                              : `Qty: ${product.stockQuantity}`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="flex-1 overflow-y-auto p-3"
                onClick={() => setShowSearch(false)}
              >
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Package className="w-16 h-16 mb-4 text-gray-200" />
                    <p className="text-sm">
                      Search for products or scan a barcode
                    </p>
                    <p className="text-xs mt-1 text-gray-300">
                      Or switch to Quick-Add Grid for touch-friendly browsing
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center mt-4">
                    {cart.length} item(s) in cart →
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── VISUAL GRID MODE ── */}
          {productGridMode === "grid" && (
            <POSProductGrid
              products={gridProducts}
              categories={gridCategories}
              selectedCategory={gridCategory}
              onCategoryChange={setGridCategory}
              loading={gridLoading}
              onAddToCart={addToCart}
              cart={cart}
              isScaleConnected={scale.status === "connected"}
              isWeighEligible={isWeighEligible}
              onWeighProduct={setWeighProduct}
            />
          )}

          {/* Live weighing modal — put a loose item on the connected scale
              and add exactly what it weighs, priced per the product's
              pricePerUnit. Falls back to manual entry if the scale isn't
              connected or the cashier prefers the old flow. */}
          {weighProduct && (
            <WeighModal
              product={weighProduct}
              onClose={() => setWeighProduct(null)}
              onAdd={(_, weightKg) => addWeighedToCart(weighProduct, weightKg)}
              onAddManually={() => {
                const p = weighProduct;
                setWeighProduct(null);
                if (p) addToCart(p);
              }}
            />
          )}

          {/* Option picker for products found via Search/Scan or barcode —
              mirrors POSProductGrid's picker so choosing a preset works the
              same way no matter how the product was found. */}
          {searchPickerProduct && (
            <div
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
              onClick={() => setSearchPickerProduct(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm font-bold text-gray-900 line-clamp-2">
                  {searchPickerProduct.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 mb-3">
                  Select an option to add it to the sale.
                </p>
                {(searchPickerProduct.variations || []).filter((v) => v.isActive).length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {(searchPickerProduct.variations || [])
                      .filter((v) => v.isActive)
                      .map((v) => {
                        const dedicated =
                          v.stockQuantity !== null && v.stockQuantity !== undefined;
                        const available = dedicated
                          ? (v.stockQuantity as number)
                          : searchPickerProduct.trackInventory
                            ? Math.floor((searchPickerProduct.stockQuantity ?? Infinity) / v.quantity)
                            : Infinity;
                        const soldOut = available <= 0;
                        return (
                          <button
                            key={v.id}
                            disabled={soldOut}
                            onClick={() => {
                              addToCart(searchPickerProduct, undefined, v);
                              setSearchPickerProduct(null);
                            }}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${
                              soldOut
                                ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                                : "border-gray-200 hover:border-green-500 hover:bg-green-50"
                            }`}
                          >
                            <span>
                              <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                                {v.label}
                                {v.isDefault && (
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                                    DEFAULT
                                  </span>
                                )}
                              </span>
                              <span className="block text-[11px] text-gray-400 mt-0.5">
                                {soldOut
                                  ? "Out of stock"
                                  : Number.isFinite(available)
                                    ? `${available} available`
                                    : "In stock"}
                              </span>
                            </span>
                            <span className="text-sm font-bold text-green-700">
                              {formatPrice(v.price)}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                ) : (searchPickerProduct.scalePresets || []).length === 0 ? (
                  <p className="text-xs text-red-500">
                    No preset weights are configured for this product. Contact an
                    admin to add some in Product Settings.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(searchPickerProduct.scalePresets || []).map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          addToCart(searchPickerProduct, p);
                          setSearchPickerProduct(null);
                        }}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:border-green-500 hover:bg-green-50 transition-colors"
                      >
                        {p} {searchPickerProduct.scaleUnit || "unit"}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setSearchPickerProduct(null)}
                  className="mt-4 w-full py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Cart ── */}
        <div className="w-[420px] flex-shrink-0 flex flex-col bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-gray-600" />
              <span className="font-bold text-gray-900 text-sm">
                Cart ({cart.length})
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Customer type */}
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setCustomerType("WALK_IN")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold border transition-colors ${customerType === "WALK_IN" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-200 hover:border-green-400"}`}
              >
                <User className="w-3 h-3" /> Walk-In
              </button>
              <button
                onClick={() => setCustomerType("NAMED")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold border transition-colors ${customerType === "NAMED" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-200 hover:border-green-400"}`}
              >
                <User className="w-3 h-3" /> Named Customer
              </button>
            </div>
            {customerType === "NAMED" && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="flex-1 border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:border-green-400 rounded"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-28 border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:border-green-400 rounded"
                />
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Cart is empty
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {cart.map((item) => (
                  <CartItemRow
                    key={`${item.product.id}-${item.variationId || "base"}`}
                    item={item}
                    onQtyChange={(qty) =>
                      updateQty(item.product.id, qty, item.variationId)
                    }
                    onDiscountChange={(d) =>
                      updateItemDiscount(item.product.id, d, item.variationId)
                    }
                    onRemove={() =>
                      setCart((p) =>
                        p.filter(
                          (i) =>
                            !(
                              i.product.id === item.product.id &&
                              i.variationId === item.variationId
                            ),
                        ),
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 bg-gray-50">
            {/* Discount */}
            <div className="px-4 py-2 border-b border-gray-100">
              <button
                onClick={() => setShowDiscountPanel(!showDiscountPanel)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-green-700"
              >
                <Tag className="w-3.5 h-3.5" /> Discount / Coupon
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showDiscountPanel ? "rotate-180" : ""}`}
                />
              </button>
              {showDiscountPanel && (
                <div className="mt-2 space-y-2">
                  {appliedDiscount ? (
                    <div className="flex items-center justify-between bg-green-100 border border-green-300 rounded px-2 py-1.5 text-xs">
                      <span className="font-bold text-green-800">
                        {appliedDiscount.code}
                      </span>
                      <button onClick={() => setAppliedDiscount(null)}>
                        <X className="w-3 h-3 text-green-700" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Coupon code"
                        value={couponCode}
                        onChange={(e) =>
                          setCouponCode(e.target.value.toUpperCase())
                        }
                        className="flex-1 border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:border-green-400 rounded"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={couponLoading}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {couponLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-600 w-24">
                      Manual off (₦):
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={manualDiscount || ""}
                      onChange={(e) =>
                        setManualDiscount(
                          Math.max(0, parseFloat(e.target.value) || 0),
                        )
                      }
                      className="flex-1 border border-gray-300 px-2 py-1.5 text-xs focus:outline-none rounded"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-green-700 font-medium">
                  <span>Discount</span>
                  <span>-{formatPrice(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-gray-900 text-lg pt-1 border-t border-gray-200">
                <span>TOTAL</span>
                <span className="text-green-700">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="px-4 pb-4 space-y-2">
              <button
                onClick={() => setShowPayment(true)}
                disabled={cart.length === 0}
                className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-gray-900 font-extrabold py-4 rounded-lg text-lg flex items-center justify-center gap-2 shadow"
              >
                <CreditCard className="w-5 h-5" /> CHARGE {formatPrice(total)}
              </button>
              {/* Suspend button — holds current cart for later */}
              <button
                onClick={() => setShowSuspendDialog(true)}
                disabled={cart.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
                title="Pause this transaction and start a new one"
              >
                <PauseCircle className="w-4 h-4" /> Hold Transaction
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment Modal ── */}
      {showPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-lg">Process Payment</h2>
              <button onClick={() => setShowPayment(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500">Amount Due</p>
                <p className="text-4xl font-extrabold text-green-700">
                  {formatPrice(total)}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-5">
                {(["CASH", "CARD", "TRANSFER", "SPLIT"] as PaymentMethod[]).map(
                  (m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-lg border-2 transition-all text-xs font-semibold ${paymentMethod === m ? "border-green-500 bg-green-50 text-green-800" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                    >
                      {m === "CASH" && <Banknote className="w-5 h-5" />}
                      {m === "CARD" && <CreditCard className="w-5 h-5" />}
                      {m === "TRANSFER" && (
                        <ArrowRightLeft className="w-5 h-5" />
                      )}
                      {m === "SPLIT" && <Calculator className="w-5 h-5" />}
                      {m}
                    </button>
                  ),
                )}
              </div>

              {paymentMethod === "CASH" && (
                <div className="space-y-3">
                  <input
                    type="number"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder={String(Math.ceil(total / 100) * 100)}
                    className="w-full border-2 border-gray-300 px-4 py-3 text-xl font-bold focus:outline-none focus:border-green-500 rounded-lg text-center"
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-2">
                    {[total, ...quickAmounts.slice(0, 5)].map((amt, i) => (
                      <button
                        key={i}
                        onClick={() => setAmountTendered(String(amt))}
                        className="px-3 py-1.5 border border-gray-300 rounded text-sm font-semibold hover:border-green-500 hover:bg-green-50"
                      >
                        {i === 0 ? "Exact" : formatPrice(amt)}
                      </button>
                    ))}
                  </div>
                  {amountTendered && parseFloat(amountTendered) >= total && (
                    <div className="bg-green-100 border border-green-300 rounded-lg p-3 text-center">
                      <p className="text-sm text-green-700 font-medium">
                        Change:
                      </p>
                      <p className="text-2xl font-extrabold text-green-800">
                        {formatPrice(parseFloat(amountTendered) - total)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(paymentMethod === "CARD" || paymentMethod === "TRANSFER") && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center space-y-3">
                  <p className="text-sm text-blue-700 font-medium">
                    {paymentMethod === "CARD"
                      ? "💳 POS Terminal"
                      : "🏦 Bank Transfer"}
                  </p>
                  <input
                    type="text"
                    placeholder="Reference / Receipt No. (optional)"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full border border-blue-200 px-3 py-2 text-sm rounded focus:outline-none focus:border-blue-400"
                  />
                </div>
              )}

              {paymentMethod === "SPLIT" && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 text-center">
                    Remaining:{" "}
                    <strong>{formatPrice(Math.max(0, splitRemaining))}</strong>
                  </p>
                  {splitPayments.map((sp, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={sp.method}
                        onChange={(e) => {
                          const n = [...splitPayments];
                          n[i].method = e.target.value as any;
                          setSplitPayments(n);
                        }}
                        className="border border-gray-300 px-2 py-2 text-sm rounded focus:outline-none w-28"
                      >
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="TRANSFER">Transfer</option>
                      </select>
                      <input
                        type="number"
                        value={sp.amount || ""}
                        onChange={(e) => {
                          const n = [...splitPayments];
                          n[i].amount = parseFloat(e.target.value) || 0;
                          setSplitPayments(n);
                        }}
                        placeholder="Amount"
                        className="flex-1 border border-gray-300 px-3 py-2 text-sm rounded focus:outline-none focus:border-green-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={processPayment}
                disabled={processing}
                className="w-full mt-5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-extrabold py-4 rounded-xl text-lg flex items-center justify-center gap-2"
              >
                {processing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" /> Confirm Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Camera Barcode Scanner Modal ── */}
      {showCameraScanner && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-500" />
                <span className="font-bold text-gray-900">
                  Scan Product Barcode
                </span>
              </div>
              <button onClick={stopCameraScanner}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-700" />
              </button>
            </div>

            {/* Video viewfinder */}
            <div className="relative bg-black">
              <video
                ref={videoRef}
                className="w-full"
                style={{ maxHeight: "320px", objectFit: "cover" }}
                autoPlay
                muted
                playsInline
              />
              {/* Targeting overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-52 h-32">
                  {/* Corner brackets */}
                  <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl" />
                  <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr" />
                  <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl" />
                  <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br" />
                  {/* Scan line animation */}
                  <div
                    className="absolute left-1 right-1 h-0.5 bg-amber-400 opacity-80"
                    style={{
                      animation: "scanline 1.8s linear infinite",
                      top: "50%",
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 text-center space-y-2">
              <p className="text-sm text-gray-600">
                Point the camera at the product barcode or QR code
              </p>
              <p className="text-xs text-gray-400">
                Supports EAN-13, EAN-8, Code128, QR Code, and more
              </p>
              <button
                onClick={stopCameraScanner}
                className="mt-2 px-5 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Scanline keyframe animation injected inline */}
          <style>{`
            @keyframes scanline {
              0%   { top: 10%; }
              50%  { top: 90%; }
              100% { top: 10%; }
            }
          `}</style>
        </div>
      )}

      {/* ── Receipt Modal ── */}
      {showReceipt && completedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-bold text-gray-900">
                  Payment Successful!
                </span>
              </div>
              <button onClick={() => setShowReceipt(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div id="receipt-content" className="p-5 font-mono text-xs">
              <div className="text-center mb-3">
                <p className="font-bold text-base">NigitTriple Supermarket</p>
                <p className="text-gray-500">
                  30, Abuloma Road (Bozgomero Estate)
                </p>
                <p className="text-gray-500">Port Harcourt, Rivers State</p>
                <p className="text-gray-500">Tel: +234 916 977 6138</p>
                <div className="border-t border-dashed border-gray-300 my-2" />
                <p className="text-gray-600">
                  Receipt #{completedOrder.receiptNumber}
                </p>
                <p className="text-gray-600">
                  {completedOrder.processedAt.toLocaleString("en-NG")}
                </p>
                {completedOrder.customerName && (
                  <p className="text-gray-600">
                    Customer: {completedOrder.customerName}
                  </p>
                )}
                <div className="border-t border-dashed border-gray-300 my-2" />
              </div>
              <div className="space-y-1 mb-3">
                {completedOrder.items.map((item, i) => {
                  const isScalableItem = !!item.product.isScalable;
                  const itemUnit = item.product.scaleUnit || "unit";
                  const qtyLabel = isScalableItem
                    ? item.quantity % 1 === 0
                      ? `${item.quantity.toFixed(0)} ${itemUnit}`
                      : `${item.quantity.toFixed(1)} ${itemUnit}`
                    : String(item.quantity);
                  const priceLabel = isScalableItem
                    ? `${formatPrice(item.unitPrice)}/${itemUnit}`
                    : formatPrice(item.unitPrice);
                  return (
                    <div key={i}>
                      <div className="flex justify-between">
                        <span className="flex-1 pr-2 truncate">
                          {item.product.name}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>
                          {qtyLabel} × {priceLabel}
                          {item.discount > 0 && ` (-${item.discount}%)`}
                        </span>
                        <span>
                          {formatPrice(
                            item.unitPrice *
                              item.quantity *
                              (1 - item.discount / 100),
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(completedOrder.subtotal)}</span>
                </div>
                {completedOrder.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span>-{formatPrice(completedOrder.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-dashed border-gray-300 pt-1">
                  <span>TOTAL</span>
                  <span>{formatPrice(completedOrder.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment: {completedOrder.paymentMethod}</span>
                </div>
                {completedOrder.amountTendered !== undefined && (
                  <div className="flex justify-between">
                    <span>Tendered</span>
                    <span>{formatPrice(completedOrder.amountTendered)}</span>
                  </div>
                )}
                {completedOrder.changeGiven !== undefined &&
                  completedOrder.changeGiven > 0 && (
                    <div className="flex justify-between font-bold">
                      <span>CHANGE</span>
                      <span>{formatPrice(completedOrder.changeGiven)}</span>
                    </div>
                  )}
              </div>
              <div className="border-t border-dashed border-gray-300 mt-3 pt-2 text-center text-gray-500">
                <p>Thank you for shopping!</p>
                <p className="text-gray-400 text-[10px] mt-2">
                  Software by Calstins Ltd · calstins.com
                </p>
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => printCurrentReceipt()}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
              >
                <ShoppingCart className="w-4 h-4" /> New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Suspend Dialog ── */}
      {showSuspendDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5" />
                <h2 className="font-bold text-lg">Hold Transaction</h2>
              </div>
              <button onClick={() => setShowSuspendDialog(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                This will pause the current transaction ({cart.length} item
                {cart.length !== 1 ? "s" : ""}, {formatPrice(total)}) and let
                you serve another customer. You can resume it at any time from
                the <strong>Held</strong> queue.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Optional note (e.g. "Customer checking wallet")
                </label>
                <input
                  type="text"
                  value={suspendLabel}
                  onChange={(e) => setSuspendLabel(e.target.value)}
                  placeholder="Leave blank if not needed"
                  className="w-full border border-gray-300 px-3 py-2 text-sm rounded focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && handleSuspend()}
                  autoFocus
                />
              </div>
              <button
                onClick={handleSuspend}
                disabled={suspending}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {suspending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PauseCircle className="w-4 h-4" />
                )}
                Hold Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Suspended Orders Panel ── */}
      {showSuspendPanel && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5" />
                <h2 className="font-bold text-lg">
                  Held Transactions ({suspendedOrders.length})
                </h2>
              </div>
              <button onClick={() => setShowSuspendPanel(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {suspendedOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <PauseCircle className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm">No held transactions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suspendedOrders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-blue-200 rounded-lg p-4 bg-blue-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm">
                            {order.posOrderNumber}
                          </p>
                          {order.suspendLabel && (
                            <p className="text-xs text-blue-700 font-medium mt-0.5">
                              📝 {order.suspendLabel}
                            </p>
                          )}
                          {order.customerName &&
                            order.customerName !== "Walk-In Customer" && (
                              <p className="text-xs text-gray-600 mt-0.5">
                                👤 {order.customerName}
                              </p>
                            )}
                          <p className="text-xs text-gray-500 mt-1">
                            {order.items.length} item
                            {order.items.length !== 1 ? "s" : ""} ·{" "}
                            <span className="font-semibold text-gray-900">
                              {formatPrice(order.total)}
                            </span>
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Held at{" "}
                            {new Date(order.suspendedAt).toLocaleTimeString(
                              "en-NG",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </p>
                          {/* Item mini-list */}
                          <ul className="mt-2 space-y-0.5">
                            {order.items.slice(0, 3).map((item) => (
                              <li
                                key={item.id}
                                className="text-[10px] text-gray-600 truncate"
                              >
                                • {item.productName} ×{item.quantity}
                              </li>
                            ))}
                            {order.items.length > 3 && (
                              <li className="text-[10px] text-gray-400">
                                + {order.items.length - 3} more
                              </li>
                            )}
                          </ul>
                        </div>
                        <button
                          onClick={() => handleResume(order)}
                          disabled={!!resuming || cart.length > 0}
                          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg"
                          title={
                            cart.length > 0
                              ? "Clear or hold current cart first"
                              : "Resume this transaction"
                          }
                        >
                          {resuming === order.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <PlayCircle className="w-3.5 h-3.5" />
                          )}
                          Resume
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {cart.length > 0 && suspendedOrders.length > 0 && (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠️ You have an active cart. Hold or clear it before resuming a
                  transaction.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Close Session Modal ── */}
      {showCloseSession && session && (
        <CloseSessionModal
          session={session}
          onClose={() => setShowCloseSession(false)}
          onClosed={() => {
            setSession(null);
            setShowCloseSession(false);
          }}
        />
      )}
    </div>
  );
}
