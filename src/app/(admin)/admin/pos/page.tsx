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
} from "lucide-react";
import { apiGet, apiPost, apiPut, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatPrice } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  stockQuantity: number;
  images: string[];
  netWeight?: string;
  unitsPerCarton?: number;
  category?: { name: string };
  brand?: { name: string };
}
interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
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
  const lineTotal = item.unitPrice * item.quantity * (1 - item.discount / 100);

  return (
    <div className="px-4 py-3 hover:bg-gray-50">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 line-clamp-1">
            {item.product.name}
          </p>
          <p className="text-[10px] text-gray-400">
            {item.product.sku}
            {item.product.netWeight && ` · ${item.product.netWeight}`}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-gray-600">
              {formatPrice(item.unitPrice)}
            </span>
            {item.discount > 0 && (
              <span className="text-[10px] text-green-700 bg-green-100 px-1 rounded">
                -{item.discount}%
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center border border-gray-200 rounded overflow-hidden">
          <button
            onClick={() => onQtyChange(item.quantity - 1)}
            className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
          <span className="w-7 text-center text-xs font-bold">
            {item.quantity}
          </span>
          <button
            onClick={() => onQtyChange(item.quantity + 1)}
            className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
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

// ─── Main POS ─────────────────────────────────────────────────────────────────
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
  onAddToCart: (product: Product) => void;
  cart: CartItem[];
}

function POSProductGrid({
  products,
  categories,
  selectedCategory,
  onCategoryChange,
  loading,
  onAddToCart,
  cart,
}: POSProductGridProps) {
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
              const inCart = cart.find((i) => i.product.id === product.id);
              const outOfStock = product.stockQuantity <= 0;
              return (
                <button
                  key={product.id}
                  onClick={() => !outOfStock && onAddToCart(product)}
                  disabled={outOfStock}
                  className={`relative flex flex-col rounded-xl border-2 overflow-hidden transition-all active:scale-95 text-left ${
                    outOfStock
                      ? "border-gray-100 opacity-50 cursor-not-allowed bg-gray-50"
                      : inCart
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
                  {inCart && (
                    <span className="absolute top-1.5 right-1.5 bg-green-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                      {inCart.quantity}
                    </span>
                  )}

                  {/* Out of stock badge */}
                  {outOfStock && (
                    <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Out
                    </span>
                  )}

                  {/* Product info */}
                  <div className="p-1.5">
                    <p className="text-[11px] font-semibold text-gray-900 line-clamp-2 leading-tight">
                      {product.name}
                    </p>
                    <p className="text-[11px] font-bold text-green-700 mt-0.5">
                      {formatPrice(product.price)}
                    </p>
                    <p className="text-[9px] text-gray-400">
                      Qty: {product.stockQuantity}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function POSPage() {
  const { user } = useAuthStore();
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
        addToCart(products[0]);
        if (barcodeRef.current) barcodeRef.current.value = "";
      } else toast(`No product for barcode: ${code}`, "error");
    } catch {
      toast("Barcode lookup failed", "error");
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing)
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      return [
        ...prev,
        { product, quantity: 1, unitPrice: product.price, discount: 0 },
      ];
    });
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((p) => p.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((p) =>
      p.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i)),
    );
  };

  const updateItemDiscount = (productId: string, pct: number) => {
    setCart((p) =>
      p.map((i) =>
        i.product.id === productId
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
                </div>

                {/* Search results dropdown */}
                {showSearch && searchResults.length > 0 && (
                  <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-64 overflow-y-auto w-[calc(100%-2rem)]">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
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
                            {formatPrice(product.price)}
                          </p>
                          <p className="text-xs text-gray-400">
                            Qty: {product.stockQuantity}
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
            />
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
                    key={item.product.id}
                    item={item}
                    onQtyChange={(qty) => updateQty(item.product.id, qty)}
                    onDiscountChange={(d) =>
                      updateItemDiscount(item.product.id, d)
                    }
                    onRemove={() =>
                      setCart((p) =>
                        p.filter((i) => i.product.id !== item.product.id),
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

            <div className="px-4 pb-4">
              <button
                onClick={() => setShowPayment(true)}
                disabled={cart.length === 0}
                className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-gray-900 font-extrabold py-4 rounded-lg text-lg flex items-center justify-center gap-2 shadow"
              >
                <CreditCard className="w-5 h-5" /> CHARGE {formatPrice(total)}
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
                <p className="text-gray-500">Port Harcourt, Rivers State</p>
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
                {completedOrder.items.map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between">
                      <span className="flex-1 pr-2 truncate">
                        {item.product.name}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>
                        {item.quantity} x {formatPrice(item.unitPrice)}
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
                ))}
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
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => window.print()}
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
