"use client";
// frontend/src/app/(guest)/checkout/page.tsx
// Shipping calculated at checkout using state + LGA for precise zone matching

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle,
  Package,
  Truck,
  CreditCard,
  FileText,
  Plus,
  MapPin,
  Store,
  Tag,
  X,
  ChevronRight,
  Scale,
} from "lucide-react";
import { z } from "zod";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/store/uiStore";
import { apiPost, apiGet, getApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { nigeriaStatesLgas } from "@/data/nigeria-states-lgas";
import Image from "next/image";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
const checkoutSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().min(10, "Valid phone is required"),
  paymentMethod: z.enum(["PAYSTACK", "BANK_TRANSFER", "CASH_ON_DELIVERY"]),
  notes: z.string().optional(),
});
type CheckoutForm = z.infer<typeof checkoutSchema>;

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  addressLine2?: string;
  city: string;
  state: string;
  lga?: string;
  country: string;
  postalCode?: string;
  label?: string;
  isDefault: boolean;
}

interface ShippingMethod {
  id: string;
  name: string;
  type: "TABLE_RATE" | "FLAT_RATE" | "STORE_PICKUP";
  cost: number;
  estimatedMinDays?: number;
  estimatedMaxDays?: number;
  storeAddress?: {
    name: string;
    address: string;
    city: string;
    phone: string;
    hours: string;
  };
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

const STEPS = ["Address", "Shipping", "Payment", "Review"];

function calculateTotalWeight(items: any[]): number {
  return items.reduce(
    (t, item) => t + (item.product?.weight || 0.5) * item.quantity,
    0,
  );
}

// ─── LGA Selector ─────────────────────────────────────────────────────────────
function LGASelector({
  state,
  lga,
  onChange,
}: {
  state: string;
  lga: string;
  onChange: (lga: string) => void;
}) {
  const stateData = nigeriaStatesLgas.find((s: any) => s.state === state);
  const lgas: string[] = stateData?.lga || [];

  if (lgas.length === 0) return null;

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">
        Local Government Area (LGA) *
        <span className="ml-1 font-normal text-gray-500">
          — used for precise shipping cost
        </span>
      </label>
      <select
        value={lga}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white rounded"
      >
        <option value="">Select LGA...</option>
        {lgas.map((l: string) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Address Form ─────────────────────────────────────────────────────────────
function AddressForm({ onSave }: { onSave: (addr: Address) => void }) {
  const [form, setForm] = useState({
    label: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    addressLine2: "",
    city: "",
    state: "Rivers",
    lga: "",
    country: "Nigeria",
    postalCode: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // When state changes, reset LGA
  const handleStateChange = (state: string) => {
    set("state", state);
    set("lga", "");
  };

  const handleSave = () => {
    if (!form.firstName || !form.address || !form.city || !form.state) return;
    onSave({
      ...form,
      id: Math.random().toString(36).slice(2),
      isDefault: false,
    });
  };

  const inp =
    "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 rounded";

  return (
    <div className="space-y-3 border border-gray-200 p-4 rounded bg-gray-50">
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="First name *"
          value={form.firstName}
          onChange={(e) => set("firstName", e.target.value)}
          className={inp}
        />
        <input
          placeholder="Last name"
          value={form.lastName}
          onChange={(e) => set("lastName", e.target.value)}
          className={inp}
        />
      </div>
      <input
        placeholder="Phone *"
        value={form.phone}
        onChange={(e) => set("phone", e.target.value)}
        className={inp}
      />
      <input
        placeholder="Street address *"
        value={form.address}
        onChange={(e) => set("address", e.target.value)}
        className={inp}
      />
      <input
        placeholder="Apartment/unit (optional)"
        value={form.addressLine2}
        onChange={(e) => set("addressLine2", e.target.value)}
        className={inp}
      />
      <input
        placeholder="City / Town *"
        value={form.city}
        onChange={(e) => set("city", e.target.value)}
        className={inp}
      />

      {/* State dropdown from LGA data */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          State *
        </label>
        <select
          value={form.state}
          onChange={(e) => handleStateChange(e.target.value)}
          className={inp + " bg-white"}
        >
          {nigeriaStatesLgas.map((s: any) => (
            <option key={s.state} value={s.state}>
              {s.state}
            </option>
          ))}
        </select>
      </div>

      {/* LGA dropdown — dynamically loaded from selected state */}
      <LGASelector
        state={form.state}
        lga={form.lga}
        onChange={(v) => set("lga", v)}
      />

      <input
        placeholder="Address label (e.g. Home, Office)"
        value={form.label}
        onChange={(e) => set("label", e.target.value)}
        className={inp}
      />

      <button
        type="button"
        onClick={handleSave}
        className="w-full bg-green-600 text-white text-sm font-semibold py-2.5 rounded hover:bg-green-700"
      >
        Use This Address
      </button>
    </div>
  );
}

// ─── Checkout Page ────────────────────────────────────────────────────────────
export default function CheckoutPageContent() {
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingZoneName, setShippingZoneName] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Discount | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState("");

  const { items, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const toast = useToast();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: user?.name || "",
      customerEmail: user?.email || "",
      customerPhone: (user as any)?.phone || "",
      paymentMethod: "PAYSTACK",
    },
  });

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const selectedMethod = shippingMethods.find((m) => m.id === selectedMethodId);
  const totalWeight = useMemo(() => calculateTotalWeight(items), [items]);

  const subtotal = useMemo(
    () => items.reduce((s, item) => s + item.price * item.quantity, 0),
    [items],
  );

  // Shipping cost from the pre-calculated method (server already computed it)
  const shippingCost = useMemo(() => {
    if (!selectedMethod) return 0;
    // FREE_SHIPPING coupon
    if (appliedCoupon?.type === "FREE_SHIPPING") return 0;
    return selectedMethod.cost;
  }, [selectedMethod, appliedCoupon]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === "FREE_SHIPPING") return shippingCost;
    if (appliedCoupon.type === "PERCENTAGE") {
      const pct = (subtotal * appliedCoupon.value) / 100;
      return appliedCoupon.maxDiscount
        ? Math.min(pct, appliedCoupon.maxDiscount)
        : pct;
    }
    if (appliedCoupon.type === "FIXED_AMOUNT")
      return Math.min(appliedCoupon.value, subtotal);
    return 0;
  }, [appliedCoupon, subtotal, shippingCost]);

  const total = subtotal + shippingCost - discountAmount;

  // Load saved addresses
  useEffect(() => {
    if (user) {
      apiGet<any>("/addresses")
        .then((res) => {
          const addrs = res.data.addresses || [];
          setAddresses(addrs);
          const def = addrs.find((a: Address) => a.isDefault);
          if (def) setSelectedAddressId(def.id);
        })
        .catch(() => {});
    } else {
      setShowAddressForm(true);
    }
  }, [user]);

  // ── Load shipping methods using state + LGA ──
  const loadShippingMethods = async (state: string, lga?: string) => {
    if (!state) return;
    setShippingLoading(true);
    setShippingMethods([]);
    setSelectedMethodId("");
    try {
      const res = await apiPost<any>("/shipping/calculate", {
        state,
        lga: lga || undefined, // ← send LGA for precise zone matching
        orderAmount: subtotal,
        weight: totalWeight,
        categoryIds: items
          .map((i: any) => i.product?.categoryId)
          .filter(Boolean),
        productIds: items.map((i: any) => i.productId),
      });
      const methods: ShippingMethod[] = res.data.methods || [];
      setShippingMethods(methods);
      setShippingZoneName(res.data.zone || "");
      if (methods.length > 0) setSelectedMethodId(methods[0].id);
    } catch {
      toast("Failed to load shipping options", "error");
    } finally {
      setShippingLoading(false);
    }
  };

  const handleAddressNext = () => {
    const addr = addresses.find((a) => a.id === selectedAddressId);
    if (!addr && !showAddressForm) {
      toast("Please select a delivery address", "error");
      return;
    }
    if (addr) {
      loadShippingMethods(addr.state, addr.lga);
    }
    setStep(1);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await apiPost<any>("/discounts/validate", {
        code: couponCode.trim().toUpperCase(),
        orderAmount: subtotal,
      });
      if (res.data.valid) {
        setAppliedCoupon(res.data.discount);
        toast("Coupon applied!", "success");
      } else setCouponError(res.data.message || "Invalid coupon");
    } catch (err) {
      setCouponError(getApiError(err));
    } finally {
      setCouponLoading(false);
    }
  };

  const onSubmit = async (data: CheckoutForm) => {
    if (!selectedMethodId) {
      toast("Please select a shipping method", "error");
      return;
    }

    setSubmitting(true);
    try {
      const addr = selectedAddress || {
        firstName: data.customerName.split(" ")[0],
        lastName: data.customerName.split(" ").slice(1).join(" "),
        phone: data.customerPhone,
        address: "To be provided",
        city: "Port Harcourt",
        state: "Rivers",
        lga: "",
        country: "Nigeria",
      };

      const res = await apiPost<any>("/orders", {
        ...data,
        shippingAddress: addr,
        shippingMethodId: selectedMethodId,
        discountCode: appliedCoupon?.code,
        discountId: appliedCoupon?.id,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal,
        shippingCost,
        discountAmount,
        total,
      });

      setOrderId(res.data.order.id);

      if (data.paymentMethod === "PAYSTACK") {
        const payRes = await apiPost<any>("/payments/initialize", {
          orderId: res.data.order.id,
          email: data.customerEmail,
          amount: Math.round(total * 100),
        });
        clearCart();
        window.location.href = payRes.data.authorizationUrl;
      } else {
        clearCart();
        setSuccess(true);
      }
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Empty / Success screens ────────────────────────────────────────────────
  if (items.length === 0 && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Your cart is empty</p>
          <Link
            href="/products"
            className="text-green-600 hover:underline font-medium"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow text-center max-w-md w-full mx-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Order Placed!
          </h2>
          <p className="text-gray-600 mb-6">
            Thank you for your order. We'll contact you shortly.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href={`/orders/${orderId}`}
              className="px-5 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700"
            >
              Track Order
            </Link>
            <Link
              href="/products"
              className="px-5 py-2 border border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inp =
    "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 rounded";

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">
          Checkout
        </h1>

        {/* Steps */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? "bg-green-600 text-white" : i === step ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500"}`}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:block ${i === step ? "text-gray-900" : "text-gray-400"}`}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${i < step ? "bg-green-600" : "bg-gray-200"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: Steps ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* STEP 0: Address */}
            {step === 0 && (
              <div className="bg-white border border-gray-200 p-5 rounded">
                <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-600" /> Delivery Address
                </h2>

                {user && addresses.length > 0 && !showAddressForm && (
                  <div className="space-y-3 mb-4">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`flex items-start gap-3 p-3 border rounded cursor-pointer transition-colors ${selectedAddressId === addr.id ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {addr.firstName} {addr.lastName}
                            {addr.label && (
                              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {addr.label}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {addr.address}, {addr.lga ? `${addr.lga}, ` : ""}
                            {addr.city}, {addr.state}
                          </div>
                          <div className="text-xs text-gray-500">
                            {addr.phone}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {(showAddressForm || !user) && (
                  <AddressForm
                    onSave={(addr) => {
                      setAddresses((p) => [...p, addr]);
                      setSelectedAddressId(addr.id);
                      setShowAddressForm(false);
                    }}
                  />
                )}

                {user && !showAddressForm && (
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 mt-2"
                  >
                    <Plus className="w-4 h-4" /> Add new address
                  </button>
                )}

                <button
                  onClick={handleAddressNext}
                  className="mt-5 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded flex items-center justify-center gap-2"
                >
                  Continue to Shipping <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 1: Shipping */}
            {step === 1 && (
              <div className="bg-white border border-gray-200 p-5 rounded">
                <h2 className="font-bold text-gray-900 text-lg mb-1 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-green-600" /> Shipping Method
                </h2>

                {selectedAddress && (
                  <div className="mb-3 flex items-start gap-2 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-500" />
                    <span>
                      Delivering to:{" "}
                      <strong>
                        {selectedAddress.lga ? `${selectedAddress.lga}, ` : ""}
                        {selectedAddress.state}
                      </strong>
                      {shippingZoneName && (
                        <span className="ml-1 text-gray-400">
                          ({shippingZoneName})
                        </span>
                      )}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                  <Scale className="w-3.5 h-3.5" />
                  Cart weight: <strong>{totalWeight.toFixed(2)}kg</strong>
                </div>

                {shippingLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                  </div>
                ) : shippingMethods.length === 0 ? (
                  <div className="py-6 text-center">
                    <Truck className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      No shipping options for your area.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Please contact us to arrange delivery.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shippingMethods.map((method) => {
                      const isFree =
                        method.cost === 0 ||
                        appliedCoupon?.type === "FREE_SHIPPING";
                      return (
                        <label
                          key={method.id}
                          className={`flex items-start gap-3 p-4 border rounded cursor-pointer transition-colors ${selectedMethodId === method.id ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}
                        >
                          <input
                            type="radio"
                            checked={selectedMethodId === method.id}
                            onChange={() => setSelectedMethodId(method.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {method.type === "STORE_PICKUP" ? (
                                  <Store className="w-4 h-4 text-amber-600" />
                                ) : (
                                  <Truck className="w-4 h-4 text-green-600" />
                                )}
                                <span className="font-semibold text-sm text-gray-900">
                                  {method.name}
                                </span>
                              </div>
                              <span className="text-sm font-bold">
                                {isFree ? (
                                  <span className="text-green-600">FREE</span>
                                ) : (
                                  formatPrice(method.cost)
                                )}
                              </span>
                            </div>
                            {method.estimatedMinDays !== undefined &&
                              method.estimatedMinDays > 0 && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Estimated: {method.estimatedMinDays}–
                                  {method.estimatedMaxDays} business days
                                </p>
                              )}
                            {method.type === "STORE_PICKUP" &&
                              method.storeAddress && (
                                <div className="mt-2 text-xs text-gray-600 bg-amber-50 border border-amber-100 rounded p-2">
                                  <p className="font-semibold">
                                    {method.storeAddress.name}
                                  </p>
                                  <p>
                                    {method.storeAddress.address},{" "}
                                    {method.storeAddress.city}
                                  </p>
                                  <p>{method.storeAddress.hours}</p>
                                  <p className="text-green-700 font-medium">
                                    📞 {method.storeAddress.phone}
                                  </p>
                                </div>
                              )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Coupon */}
                <div className="mt-5 p-4 border border-dashed border-gray-300 rounded bg-gray-50">
                  <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-green-600" /> Have a coupon?
                  </p>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-100 border border-green-300 rounded px-3 py-2">
                      <span className="font-bold text-green-800 text-sm">
                        {appliedCoupon.code}
                      </span>
                      <button
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponCode("");
                        }}
                      >
                        <X className="w-4 h-4 text-green-700" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponError("");
                          }}
                          className="flex-1 border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 rounded"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponCode}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {couponLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Apply"
                          )}
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-xs text-red-600 mt-1">
                          {couponError}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setStep(0)}
                    className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!selectedMethodId}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded flex items-center justify-center gap-2"
                  >
                    Continue to Payment <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Payment & Contact */}
            {step === 2 && (
              <div className="bg-white border border-gray-200 p-5 rounded">
                <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-600" /> Payment &
                  Contact
                </h2>
                <form className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        {...register("customerName")}
                        className={inp}
                        placeholder="Your full name"
                      />
                      {errors.customerName && (
                        <p className="text-xs text-red-500 mt-0.5">
                          {errors.customerName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Phone *
                      </label>
                      <input
                        {...register("customerPhone")}
                        className={inp}
                        placeholder="+234 801 234 5678"
                      />
                      {errors.customerPhone && (
                        <p className="text-xs text-red-500 mt-0.5">
                          {errors.customerPhone.message}
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        {...register("customerEmail")}
                        type="email"
                        className={inp}
                        placeholder="your@email.com"
                      />
                      {errors.customerEmail && (
                        <p className="text-xs text-red-500 mt-0.5">
                          {errors.customerEmail.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Payment Method *
                    </label>
                    <div className="space-y-2">
                      {[
                        {
                          value: "PAYSTACK",
                          label: "Pay Online (Card / Bank Transfer)",
                          icon: "💳",
                        },
                        {
                          value: "BANK_TRANSFER",
                          label: "Manual Bank Transfer",
                          icon: "🏦",
                        },
                        {
                          value: "CASH_ON_DELIVERY",
                          label:
                            selectedMethod?.type === "STORE_PICKUP"
                              ? "Pay at Pickup (Cash)"
                              : "Cash on Delivery",
                          icon:
                            selectedMethod?.type === "STORE_PICKUP"
                              ? "💵"
                              : "📦",
                        },
                      ].map(({ value, label, icon }) => (
                        <label
                          key={value}
                          className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:border-green-400 transition-colors"
                        >
                          <input
                            type="radio"
                            value={value}
                            {...register("paymentMethod")}
                          />
                          <span className="text-sm">
                            {icon} {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Order Notes (optional)
                    </label>
                    <textarea
                      {...register("notes")}
                      rows={3}
                      className={inp + " resize-none"}
                      placeholder="Any special instructions?"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded flex items-center justify-center gap-2"
                    >
                      Review Order <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: Review */}
            {step === 3 && (
              <div className="bg-white border border-gray-200 p-5 rounded">
                <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" /> Review Your
                  Order
                </h2>

                <div className="space-y-3 mb-5">
                  {items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-3 border-b border-gray-100"
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        {item.product?.images?.[0] && (
                          <Image
                            src={item.product.images[0]}
                            alt={item.product?.name || ""}
                            width={48}
                            height={48}
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {item.product?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                {selectedAddress && (
                  <div className="mb-3 p-3 bg-gray-50 rounded text-sm">
                    <p className="font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Delivering to:
                    </p>
                    <p className="text-gray-600">
                      {selectedAddress.address}
                      {selectedAddress.lga
                        ? `, ${selectedAddress.lga}`
                        : ""}, {selectedAddress.city}, {selectedAddress.state}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {selectedAddress.phone}
                    </p>
                  </div>
                )}
                {selectedMethod && (
                  <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
                    <p className="font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" /> Shipping:
                    </p>
                    <p className="text-gray-600">
                      {selectedMethod.name} —{" "}
                      {shippingCost === 0 ? (
                        <span className="text-green-600 font-semibold">
                          FREE
                        </span>
                      ) : (
                        formatPrice(shippingCost)
                      )}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-3 rounded flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>Place Order — {formatPrice(total)}</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 p-5 rounded sticky top-4">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide mb-4">
                Order Summary
              </h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({items.length} items)</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {selectedMethod && (
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>
                      {shippingCost === 0 ? (
                        <span className="text-green-600 font-semibold">
                          FREE
                        </span>
                      ) : (
                        formatPrice(shippingCost)
                      )}
                    </span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>
                      Discount{" "}
                      {appliedCoupon && (
                        <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded ml-1">
                          {appliedCoupon.code}
                        </span>
                      )}
                    </span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between font-bold text-gray-900 text-base">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                <Scale className="w-3 h-3" /> Cart weight:{" "}
                {totalWeight.toFixed(2)}kg
              </div>
              {selectedAddress?.lga && (
                <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {selectedAddress.lga},{" "}
                  {selectedAddress.state}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
