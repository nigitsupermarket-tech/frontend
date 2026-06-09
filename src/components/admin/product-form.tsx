"use client";

// frontend/src/components/admin/product-form.tsx
// GROCERY EDITION — adds: netWeight, unitsPerCarton, origin, ingredients, allergens,
// nutritionalInfo, storageInstructions, isHalal, isOrganic, naifdaNumber, isOnPromotion
// V2 — scalable/weighted product type (sell by weight, volume, or custom unit)

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, X, Tag, Scale, RefreshCw } from "lucide-react";
import { apiGet, apiPost, apiPut, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { generateSlug, generateSKU } from "@/lib/utils";
import { Category, Brand } from "@/types";
import { PageLoader } from "@/components/shared/loading-spinner";
import { DragDropMediaUploader } from "@/components/shared/drag-drop-media-uploader";

interface Props {
  productId?: string;
  onSave?: () => void;
}

interface MediaItem {
  url: string;
  publicId?: string;
  type: "image" | "video";
  width?: number;
  height?: number;
}

// ── Reusable field components (defined OUTSIDE the component to prevent remounting) ──
function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 rounded"
      />
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-green-600"
      />
      <div>
        <span className="text-sm font-medium text-gray-800">{label}</span>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
    </label>
  );
}

// ── Scalable unit options ────────────────────────────────────────────────────
const SCALE_UNITS = [
  { value: "kg", label: "kg (kilogram)" },
  { value: "g", label: "g (gram)" },
  { value: "lb", label: "lb (pound)" },
  { value: "L", label: "L (litre)" },
  { value: "ml", label: "ml (millilitre)" },
  { value: "cup", label: "cup" },
  { value: "piece", label: "piece / pc" },
  { value: "dozen", label: "dozen" },
  { value: "bag", label: "bag" },
  { value: "bunch", label: "bunch" },
  { value: "crate", label: "crate" },
  { value: "custom", label: "Custom…" },
];

const SCALE_STEPS: Record<string, number[]> = {
  kg:     [0.25, 0.5, 1, 1.5, 2, 3, 5],
  g:      [100, 250, 500, 750, 1000],
  lb:     [0.5, 1, 2, 3, 5],
  L:      [0.25, 0.5, 1, 1.5, 2],
  ml:     [100, 250, 500, 750, 1000],
  cup:    [0.5, 1, 2, 3, 4],
  piece:  [1, 2, 3, 5, 10],
  dozen:  [1, 2, 3],
  bag:    [1, 2, 3, 5],
  bunch:  [1, 2, 3],
  crate:  [1, 2, 3],
  custom: [1, 2, 3, 5],
};

interface Props {
  productId?: string;
  onSave?: () => void;
}

interface MediaItem {
  url: string;
  publicId?: string;
  type: "image" | "video";
  width?: number;
  height?: number;
}

const emptyForm = {
  // Basic
  name: "",
  slug: "",
  description: "",
  shortDescription: "",
  price: "",
  comparePrice: "",
  costPrice: "",
  sku: "",
  barcode: "",
  categoryId: "",
  brandId: "",
  tags: "",

  // Inventory
  stockQuantity: 0,
  lowStockThreshold: 10,
  allowBackorder: false,
  trackInventory: true,

  // Status
  isFeatured: false,
  isNewArrival: false,
  isOnPromotion: false,
  promotionEndsAt: "",
  status: "ACTIVE" as "ACTIVE" | "DRAFT" | "DISCONTINUED",

  // Media
  media: [] as MediaItem[],

  // Shipping dimensions
  weight: "",
  length: "",
  width: "",
  height: "",

  // ── Grocery fields ──
  netWeight: "", // e.g., "500g", "1L"
  packageSize: "", // e.g., "Pack of 6"
  unitsPerCarton: "", // e.g., 12
  origin: "", // Country of origin
  ingredients: "",
  allergens: "", // comma-separated
  storageInstructions: "",
  shelfLifeDays: "",
  servingSize: "",
  servingsPerPack: "",
  naifdaNumber: "", // NAFDAC registration

  // Certifications (booleans)
  requiresRefrigeration: false,
  requiresFreezing: false,
  isOrganic: false,
  isHalal: false,
  isKosher: false,
  isVegan: false,
  isGlutenFree: false,

  // Nutritional info (JSON)
  nutritionalInfo: {
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    sodium: "",
    sugar: "",
  },

  // SEO
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",

  // ── Scalable / weighted product ──
  isScalable: false,
  scaleUnit: "kg",          // unit of measurement
  scaleUnitCustom: "",      // only used when scaleUnit === "custom"
  pricePerUnit: "",         // price per 1 unit (e.g. ₦2,000/kg)
  minOrderQty: "0.1",       // minimum orderable quantity
  maxOrderQty: "",          // optional max (e.g. 10 kg)
  scaleStep: "0.1",         // increment step in POS / online store
  scalePresets: "",         // comma-separated quick-select values e.g. "0.5,1,2,3"
};

export default function ProductForm({ productId, onSave }: Props) {
  const toast = useToast();
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  // SALES role cannot create new products — redirect to product list
  useEffect(() => {
    if (!productId && user?.role === "SALES") {
      toast("Sales role cannot create new products", "error");
      router.replace("/admin/products");
    }
  }, [productId, user?.role]);
  const [isLoading, setIsLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [catsRes, brandsRes] = await Promise.all([
          apiGet<any>("/categories"),
          apiGet<any>("/brands"),
        ]);
        setCategories(catsRes.data.categories);
        setBrands(brandsRes.data.brands);

        if (productId) {
          const res = await apiGet<any>(`/products/${productId}`);
          const p = res.data.product;

          const media: MediaItem[] = (p.images || []).map((url: string) => ({
            url,
            type: "image" as const,
          }));

          const nutri = p.nutritionalInfo || {};
          setForm({
            name: p.name || "",
            slug: p.slug || "",
            description: p.description || "",
            shortDescription: p.shortDescription || "",
            price: String(p.price || ""),
            comparePrice: String(p.comparePrice || ""),
            costPrice: String(p.costPrice || ""),
            sku: p.sku || "",
            barcode: p.barcode || "",
            categoryId: p.categoryId || "",
            brandId: p.brandId || "",
            tags: (p.tags || []).join(", "),
            stockQuantity: p.stockQuantity || 0,
            lowStockThreshold: p.lowStockThreshold || 10,
            allowBackorder: p.allowBackorder || false,
            trackInventory: p.trackInventory ?? true,
            isFeatured: p.isFeatured || false,
            isNewArrival: p.isNewArrival || false,
            isOnPromotion: p.isOnPromotion || false,
            promotionEndsAt: p.promotionEndsAt
              ? new Date(p.promotionEndsAt).toISOString().split("T")[0]
              : "",
            status: p.status || "ACTIVE",
            media,
            weight: String(p.weight || ""),
            length: String(p.length || ""),
            width: String(p.width || ""),
            height: String(p.height || ""),
            // Grocery fields
            netWeight: p.netWeight || "",
            packageSize: p.packageSize || "",
            unitsPerCarton: String(p.unitsPerCarton || ""),
            origin: p.origin || "",
            ingredients: p.ingredients || "",
            allergens: (p.allergens || []).join(", "),
            storageInstructions: p.storageInstructions || "",
            shelfLifeDays: String(p.shelfLifeDays || ""),
            servingSize: p.servingSize || "",
            servingsPerPack: p.servingsPerPack || "",
            naifdaNumber: p.naifdaNumber || "",
            requiresRefrigeration: p.requiresRefrigeration || false,
            requiresFreezing: p.requiresFreezing || false,
            isOrganic: p.isOrganic || false,
            isHalal: p.isHalal || false,
            isKosher: p.isKosher || false,
            isVegan: p.isVegan || false,
            isGlutenFree: p.isGlutenFree || false,
            nutritionalInfo: {
              calories: String(nutri.calories || ""),
              protein: String(nutri.protein || ""),
              carbs: String(nutri.carbs || ""),
              fat: String(nutri.fat || ""),
              fiber: String(nutri.fiber || ""),
              sodium: String(nutri.sodium || ""),
              sugar: String(nutri.sugar || ""),
            },
            metaTitle: p.metaTitle || "",
            metaDescription: p.metaDescription || "",
            metaKeywords: p.metaKeywords || "",
            // Scalable product
            isScalable: p.isScalable || false,
            scaleUnit: p.scaleUnit || "kg",
            scaleUnitCustom: p.scaleUnitCustom || "",
            pricePerUnit: String(p.pricePerUnit || ""),
            minOrderQty: String(p.minOrderQty || "0.1"),
            maxOrderQty: String(p.maxOrderQty || ""),
            scaleStep: String(p.scaleStep || "0.1"),
            scalePresets: (p.scalePresets || []).join(", "),
          });
        }
      } catch (err) {
        toast.error(getApiError(err));
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [productId]);

  const setField = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setNutri = (key: string, value: string) =>
    setForm((prev) => ({
      ...prev,
      nutritionalInfo: { ...prev.nutritionalInfo, [key]: value },
    }));

  const handleSave = async () => {
    if (!form.name || !form.price || !form.sku || !form.categoryId || !form.barcode) {
      toast.error(
        "Please fill in all required fields (Name, SKU, Barcode, Price, Category)",
      );
      return;
    }

    // Weight is required for shipping calculation.
    // For scalable products sold by weight unit (kg/g/lb), the shipping weight
    // is derived from the ordered quantity — so "weight" means kg per 1 unit of scale.
    // For all other products, weight is the fixed shipping weight per item.
    const weightBasedUnits = ["kg", "g", "lb"];
    const isWeightBased = form.isScalable && weightBasedUnits.includes(form.scaleUnit);
    if (!form.weight) {
      if (isWeightBased) {
        // For kg/g/lb scalable products auto-fill weight = 1 (1 kg per 1 kg ordered)
        // Only block if genuinely empty and not auto-derivable
        setField("weight", "1");
      } else {
        toast.error(
          form.isScalable
            ? `Shipping weight is required — enter the weight (kg) per 1 ${form.scaleUnit === "custom" ? form.scaleUnitCustom || "unit" : form.scaleUnit} for shipping calculations`
            : "Shipping weight (kg) is required to calculate delivery costs. Go to the Shipping tab.",
        );
        setActiveTab("shipping");
        return;
      }
    }

    // ── Scalable product validation ────────────────────────────────────────
    if (form.isScalable) {
      const unit = form.scaleUnit === "custom" ? form.scaleUnitCustom || "unit" : form.scaleUnit;

      // pricePerUnit required
      if (!form.pricePerUnit || parseFloat(form.pricePerUnit) <= 0) {
        toast.error(`Price per ${unit} is required and must be greater than 0`);
        setActiveTab("scalable");
        return;
      }

      // scaleStep required and positive
      if (!form.scaleStep || parseFloat(form.scaleStep) <= 0) {
        toast.error(`Scale step must be greater than 0 (e.g. 0.1 or 1)`);
        setActiveTab("scalable");
        return;
      }

      // minOrderQty must be positive
      if (form.minOrderQty && parseFloat(form.minOrderQty) <= 0) {
        toast.error(`Minimum order must be greater than 0`);
        setActiveTab("scalable");
        return;
      }

      // minOrderQty must be >= scaleStep
      const minV = parseFloat(form.minOrderQty || "0");
      const stepV = parseFloat(form.scaleStep);
      if (minV > 0 && stepV > 0 && minV < stepV) {
        toast.error(`Minimum order (${minV} ${unit}) cannot be less than the scale step (${stepV} ${unit})`);
        setActiveTab("scalable");
        return;
      }

      // maxOrderQty must be > minOrderQty if set
      if (form.maxOrderQty) {
        const maxV = parseFloat(form.maxOrderQty);
        if (maxV <= 0) {
          toast.error(`Maximum order must be greater than 0`);
          setActiveTab("scalable");
          return;
        }
        if (minV > 0 && maxV <= minV) {
          toast.error(`Maximum order (${maxV} ${unit}) must be greater than minimum order (${minV} ${unit})`);
          setActiveTab("scalable");
          return;
        }
        // Max order cannot exceed stock
        const stockInUnits = form.stockQuantity;
        if (form.trackInventory && stockInUnits > 0 && maxV > stockInUnits) {
          toast.error(`Maximum order (${maxV} ${unit}) cannot exceed available stock (${stockInUnits} ${unit}). Update stock in the Inventory tab first.`);
          setActiveTab("scalable");
          return;
        }
      }

      // Presets must all be positive and within min/max
      if (form.scalePresets) {
        const presetVals = form.scalePresets.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
        const invalid = presetVals.find((v) => v <= 0);
        if (invalid !== undefined) {
          toast.error(`All preset values must be greater than 0`);
          setActiveTab("scalable");
          return;
        }
        if (minV > 0) {
          const tooSmall = presetVals.find((v) => v < minV);
          if (tooSmall !== undefined) {
            toast.error(`Preset ${tooSmall} ${unit} is below the minimum order of ${minV} ${unit}`);
            setActiveTab("scalable");
            return;
          }
        }
        if (form.maxOrderQty) {
          const maxV = parseFloat(form.maxOrderQty);
          const tooLarge = presetVals.find((v) => v > maxV);
          if (tooLarge !== undefined) {
            toast.error(`Preset ${tooLarge} ${unit} exceeds the maximum order of ${maxV} ${unit}`);
            setActiveTab("scalable");
            return;
          }
        }
      }

      // Custom unit name required if scaleUnit === "custom"
      if (form.scaleUnit === "custom" && !form.scaleUnitCustom.trim()) {
        toast.error(`Please enter a custom unit name (e.g. scoop, wrap, portion)`);
        setActiveTab("scalable");
        return;
      }

      // Stock quantity for scalable products should reflect total units available
      // Warn if stock = 0 but don't block (it might be intentional)
    }

    // ── Stock quantity cannot be negative ─────────────────────────────────
    if (Number(form.stockQuantity) < 0) {
      toast.error("Stock quantity cannot be negative");
      setActiveTab("inventory");
      return;
    }

    // ── Price validations ─────────────────────────────────────────────────
    if (parseFloat(form.price) <= 0) {
      toast.error("Selling price must be greater than 0");
      setActiveTab("basic");
      return;
    }
    if (form.comparePrice && parseFloat(form.comparePrice) <= parseFloat(form.price)) {
      toast.error("Compare price (original price) should be higher than the selling price");
      setActiveTab("basic");
      return;
    }

    setSaving(true);
    try {
      // When a Staff or Sales user edits an existing product and the
      // stockQuantity field has changed, we submit a stock-approval request
      // instead of writing it directly. Other fields are still saved normally.
      if (!isAdmin && productId) {
        const originalRes = await apiGet<any>(`/products/${productId}`);
        const originalQty: number =
          originalRes.data?.product?.stockQuantity ?? 0;
        const newQty = Number(form.stockQuantity);

        if (newQty !== originalQty) {
          // Submit stock change for admin approval
          const approvalRes = await apiPost<any>("/stock-approvals", {
            productId,
            requestedQty: newQty,
            reason: `Product form edit by ${user?.name || "staff"} (${user?.role})`,
            source: "PRODUCT_FORM",
          });

          if (approvalRes.data?.autoApproved) {
            toast.success("Stock updated");
          } else {
            toast.success(
              "Stock change submitted — awaiting admin approval. Other product fields saved.",
            );
          }

          // Save the rest of the product without the stockQuantity override
          const images = form.media
            .filter((m) => m.type === "image")
            .map((m) => m.url);
          const nutritionalInfo: any = {};
          Object.entries(form.nutritionalInfo).forEach(([k, v]) => {
            if (v) nutritionalInfo[k] = parseFloat(v as string);
          });
          const payloadNoStock: any = {
            name: form.name,
            slug: form.slug || generateSlug(form.name),
            description: form.description,
            shortDescription: form.shortDescription,
            price: parseFloat(form.price),
            comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : undefined,
            costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
            sku: form.sku,
            barcode: form.barcode || undefined,
            categoryId: form.categoryId,
            brandId: form.brandId || undefined,
            tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
            images,
            lowStockThreshold: Number(form.lowStockThreshold),
            allowBackorder: form.allowBackorder,
            trackInventory: form.trackInventory,
            isFeatured: form.isFeatured,
            isNewArrival: form.isNewArrival,
            isOnPromotion: form.isOnPromotion,
            promotionEndsAt: form.promotionEndsAt ? new Date(form.promotionEndsAt).toISOString() : null,
            status: form.status,
          };
          await apiPut(`/products/${productId}`, payloadNoStock);
          onSave?.();
          setSaving(false);
          return;
        }
      }
      const images = form.media
        .filter((m) => m.type === "image")
        .map((m) => m.url);

      // Build nutritional info object (only include non-empty values)
      const nutritionalInfo: any = {};
      Object.entries(form.nutritionalInfo).forEach(([k, v]) => {
        if (v) nutritionalInfo[k] = parseFloat(v as string);
      });

      const payload = {
        name: form.name,
        slug: form.slug || generateSlug(form.name),
        description: form.description,
        shortDescription: form.shortDescription,
        price: parseFloat(form.price),
        comparePrice: form.comparePrice
          ? parseFloat(form.comparePrice)
          : undefined,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
        sku: form.sku,
        barcode: form.barcode || undefined,
        categoryId: form.categoryId,
        brandId: form.brandId || undefined,
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        images,
        stockQuantity: Number(form.stockQuantity),
        lowStockThreshold: Number(form.lowStockThreshold),
        allowBackorder: form.allowBackorder,
        trackInventory: form.trackInventory,
        isFeatured: form.isFeatured,
        isNewArrival: form.isNewArrival,
        isOnPromotion: form.isOnPromotion,
        promotionEndsAt: form.promotionEndsAt
          ? new Date(form.promotionEndsAt).toISOString()
          : null,
        status: form.status,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        length: form.length ? parseFloat(form.length) : undefined,
        width: form.width ? parseFloat(form.width) : undefined,
        height: form.height ? parseFloat(form.height) : undefined,
        // Grocery fields
        netWeight: form.netWeight || undefined,
        packageSize: form.packageSize || undefined,
        unitsPerCarton: form.unitsPerCarton
          ? parseInt(form.unitsPerCarton)
          : undefined,
        origin: form.origin || undefined,
        ingredients: form.ingredients || undefined,
        allergens: form.allergens
          ? form.allergens
              .split(",")
              .map((a) => a.trim())
              .filter(Boolean)
          : [],
        storageInstructions: form.storageInstructions || undefined,
        shelfLifeDays: form.shelfLifeDays
          ? parseInt(form.shelfLifeDays)
          : undefined,
        servingSize: form.servingSize || undefined,
        servingsPerPack: form.servingsPerPack || undefined,
        naifdaNumber: form.naifdaNumber || undefined,
        requiresRefrigeration: form.requiresRefrigeration,
        requiresFreezing: form.requiresFreezing,
        isOrganic: form.isOrganic,
        isHalal: form.isHalal,
        isKosher: form.isKosher,
        isVegan: form.isVegan,
        isGlutenFree: form.isGlutenFree,
        nutritionalInfo:
          Object.keys(nutritionalInfo).length > 0 ? nutritionalInfo : undefined,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
        metaKeywords: form.metaKeywords || undefined,
        // Scalable product fields
        isScalable: form.isScalable,
        scaleUnit: form.isScalable ? (form.scaleUnit === "custom" ? form.scaleUnitCustom || "unit" : form.scaleUnit) : undefined,
        pricePerUnit: form.isScalable && form.pricePerUnit ? parseFloat(form.pricePerUnit) : undefined,
        minOrderQty: form.isScalable && form.minOrderQty ? parseFloat(form.minOrderQty) : undefined,
        maxOrderQty: form.isScalable && form.maxOrderQty ? parseFloat(form.maxOrderQty) : undefined,
        scaleStep: form.isScalable && form.scaleStep ? parseFloat(form.scaleStep) : undefined,
        scalePresets: form.isScalable && form.scalePresets
          ? form.scalePresets.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v))
          : [],
      };

      if (productId) {
        await apiPut(`/products/${productId}`, payload);
        toast.success("Product updated successfully!");
      } else {
        await apiPost("/products", payload);
        toast.success("Product created successfully!");
        setForm(emptyForm);
      }
      onSave?.();
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;

  const TABS = [
    { id: "basic", label: "Basic Info" },
    { id: "scalable", label: "📐 Scale / Weight" },
    { id: "grocery", label: "Grocery Details" },
    { id: "nutrition", label: "Nutrition" },
    { id: "inventory", label: "Inventory" },
    { id: "shipping", label: "Shipping", alert: !form.weight },
    { id: "seo", label: "SEO" },
  ];

  return (
    <div className="max-w-4xl">
      {/* Back link */}
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/admin/products"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Products
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {productId ? "Save Changes" : "Create Product"}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-5">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
              {(tab as any).alert && (
                <span className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Basic Info ── */}
      {activeTab === "basic" && (
        <div className="space-y-5">
          {/* Media */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Product Images</h3>
            <DragDropMediaUploader
              value={form.media}
              onChange={(media) => setField("media", media)}
            />
          </div>

          {/* Core details */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Product Details</h3>

            <Input
              label="Product Name"
              required
              value={form.name}
              onChange={(v) => {
                setField("name", v);
                if (!productId) {
                  setField("slug", generateSlug(v));
                  // Auto-generate SKU only if it hasn't been manually edited
                  if (!form.sku || form.sku === generateSKU(form.name)) {
                    setField("sku", generateSKU(v));
                  }
                }
              }}
              placeholder="e.g., Indomie Chicken Noodles 70g"
            />

            <div className="grid grid-cols-2 gap-4">
              {/* SKU with auto-generate button */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  SKU <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setField("sku", e.target.value)}
                    placeholder="Auto-generated from name"
                    className="flex-1 border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => setField("sku", generateSKU(form.name || "PRODUCT"))}
                    title="Regenerate SKU"
                    className="p-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-500 hover:text-green-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Auto-generated — click <RefreshCw className="w-2.5 h-2.5 inline" /> to regenerate
                </p>
              </div>

              {/* Barcode — required */}
              <Input
                label="Barcode (EAN / UPC)"
                required
                value={form.barcode}
                onChange={(v) => setField("barcode", v)}
                placeholder="5901234123457"
                hint="Required for POS barcode scanning"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Selling Price (₦)"
                required
                type="number"
                value={form.price}
                onChange={(v) => setField("price", v)}
                placeholder="1500"
              />
              <Input
                label="Compare Price (₦)"
                type="number"
                value={form.comparePrice}
                onChange={(v) => setField("comparePrice", v)}
                placeholder="2000"
                hint="Shows crossed-out price"
              />
              <Input
                label="Cost Price (₦)"
                type="number"
                value={form.costPrice}
                onChange={(v) => setField("costPrice", v)}
                placeholder="1000"
                hint="For profit calculations"
              />
            </div>

            {/* Category & Brand */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setField("categoryId", e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 rounded bg-white"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Brand
                </label>
                <select
                  value={form.brandId}
                  onChange={(e) => setField("brandId", e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 rounded bg-white"
                >
                  <option value="">Select brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={4}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 rounded resize-none"
                placeholder="Describe this product..."
              />
            </div>

            <Input
              label="Short Description"
              value={form.shortDescription}
              onChange={(v) => setField("shortDescription", v)}
              placeholder="One-liner shown on product cards"
            />

            <Input
              label="Tags (comma-separated)"
              value={form.tags}
              onChange={(v) => setField("tags", v)}
              placeholder="instant noodles, chicken, spicy"
            />
          </div>

          {/* Status & Visibility */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-4">
              Status & Visibility
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 rounded bg-white"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="DISCONTINUED">Discontinued</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Checkbox
                label="Featured Product"
                checked={form.isFeatured}
                onChange={(v) => setField("isFeatured", v)}
                description="Show in Featured Products section"
              />
              <Checkbox
                label="New Arrival"
                checked={form.isNewArrival}
                onChange={(v) => setField("isNewArrival", v)}
                description="Show in New Arrivals section"
              />
              <Checkbox
                label="🏷️ On Promotion"
                checked={form.isOnPromotion}
                onChange={(v) => setField("isOnPromotion", v)}
                description="Show in Promotions of the Week"
              />
            </div>
            {form.isOnPromotion && (
              <div className="mt-3 ml-6">
                <Input
                  label="Promotion Ends Date"
                  type="date"
                  value={form.promotionEndsAt}
                  onChange={(v) => setField("promotionEndsAt", v)}
                  hint="Leave blank for indefinite promotion"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Scale / Weight ── */}
      {activeTab === "scalable" && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-green-600" />
              <h3 className="font-semibold text-gray-900">Scalable Product</h3>
            </div>
            <p className="text-xs text-gray-500">
              Enable this for products sold by weight, volume, or variable quantity — e.g. meat per kg, sugar per cup, drinks by the litre. The price and quantity fields below replace the fixed price/stock model.
            </p>

            <Checkbox
              label="This product is sold by measurement / scale"
              checked={form.isScalable}
              onChange={(v) => setField("isScalable", v)}
              description="Enables variable quantity input on POS and online store"
            />

            {form.isScalable && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                {/* Unit of measurement */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Unit of Measurement <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.scaleUnit}
                      onChange={(e) => setField("scaleUnit", e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 rounded bg-white"
                    >
                      {SCALE_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>
                  {form.scaleUnit === "custom" && (
                    <Input
                      label="Custom Unit Name"
                      value={form.scaleUnitCustom}
                      onChange={(v) => setField("scaleUnitCustom", v)}
                      placeholder="e.g. scoop, portion, wrap"
                      hint="Shown to customers"
                    />
                  )}
                </div>

                {/* Price per unit */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={`Price per 1 ${form.scaleUnit === "custom" ? form.scaleUnitCustom || "unit" : form.scaleUnit} (₦)`}
                    required
                    type="number"
                    value={form.pricePerUnit}
                    onChange={(v) => setField("pricePerUnit", v)}
                    placeholder="e.g. 2000"
                    hint="Base unit price — final price = pricePerUnit × quantity"
                  />
                  <Input
                    label="Scale Step (increment)"
                    type="number"
                    value={form.scaleStep}
                    onChange={(v) => setField("scaleStep", v)}
                    placeholder="0.1"
                    hint={`How much each +/− moves the quantity (e.g. 0.1 ${form.scaleUnit === "custom" ? form.scaleUnitCustom || "unit" : form.scaleUnit})`}
                  />
                </div>

                {/* Min / max order */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={`Minimum Order (${form.scaleUnit === "custom" ? form.scaleUnitCustom || "unit" : form.scaleUnit})`}
                    type="number"
                    value={form.minOrderQty}
                    onChange={(v) => setField("minOrderQty", v)}
                    placeholder="0.1"
                    hint="Smallest amount a customer can order"
                  />
                  <Input
                    label={`Maximum Order (${form.scaleUnit === "custom" ? form.scaleUnitCustom || "unit" : form.scaleUnit})`}
                    type="number"
                    value={form.maxOrderQty}
                    onChange={(v) => setField("maxOrderQty", v)}
                    placeholder="Leave blank for no limit"
                    hint="Optional cap per order"
                  />
                </div>

                {/* Quick-select presets */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Quick-Select Presets (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={form.scalePresets}
                    onChange={(e) => setField("scalePresets", e.target.value)}
                    placeholder={`e.g. ${(SCALE_STEPS[form.scaleUnit] || SCALE_STEPS.custom).join(", ")}`}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 rounded"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">
                    These appear as quick-tap buttons in POS and the online store so customers can select a common quantity without typing.
                  </p>
                  {/* Visual preview */}
                  {form.scalePresets && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.scalePresets.split(",").map((v) => v.trim()).filter(Boolean).map((v, i) => (
                        <span key={i} className="px-3 py-1 bg-green-50 border border-green-200 text-green-800 text-xs font-semibold rounded-full">
                          {v} {form.scaleUnit === "custom" ? form.scaleUnitCustom || "unit" : form.scaleUnit}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info box */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">💡 How this works</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                    <li>
                      <strong>POS:</strong> Cashier types or taps a preset quantity (e.g. 1.5 kg) and the system multiplies by the price per unit.
                    </li>
                    <li>
                      <strong>Online store:</strong> Customer uses +/− buttons stepping by {form.scaleStep || "0.1"} {form.scaleUnit === "custom" ? form.scaleUnitCustom || "unit" : form.scaleUnit}, or taps a preset.
                    </li>
                    <li>
                      <strong>Stock:</strong> Use the Inventory tab to track total available {form.scaleUnit === "custom" ? form.scaleUnitCustom || "unit" : form.scaleUnit}s in stock.
                    </li>
                  </ul>
                </div>

                {/* Live stock-sync warning */}
                {form.trackInventory && form.stockQuantity > 0 && form.maxOrderQty && parseFloat(form.maxOrderQty) > form.stockQuantity && (
                  <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-xs text-red-800">
                    ⚠️ <strong>Stock sync issue:</strong> Maximum order ({form.maxOrderQty} {form.scaleUnit === "custom" ? form.scaleUnitCustom || "unit" : form.scaleUnit}) exceeds available stock ({form.stockQuantity} units). Either reduce the maximum order or increase stock in the Inventory tab.
                  </div>
                )}

                {/* Live min > step warning */}
                {form.minOrderQty && form.scaleStep &&
                  parseFloat(form.minOrderQty) > 0 &&
                  parseFloat(form.scaleStep) > 0 &&
                  parseFloat(form.minOrderQty) < parseFloat(form.scaleStep) && (
                  <div className="bg-orange-50 border border-orange-300 rounded-xl p-3 text-xs text-orange-800">
                    ⚠️ <strong>Step warning:</strong> Minimum order ({form.minOrderQty}) is less than scale step ({form.scaleStep}). The first +/− press will exceed the minimum. Consider setting minimum = step.
                  </div>
                )}

                {/* Negative value warnings */}
                {form.minOrderQty && parseFloat(form.minOrderQty) < 0 && (
                  <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-xs text-red-800">
                    ⚠️ Minimum order cannot be negative.
                  </div>
                )}
                {form.maxOrderQty && parseFloat(form.maxOrderQty) < 0 && (
                  <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-xs text-red-800">
                    ⚠️ Maximum order cannot be negative.
                  </div>
                )}
                {form.scaleStep && parseFloat(form.scaleStep) <= 0 && (
                  <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-xs text-red-800">
                    ⚠️ Scale step must be greater than 0.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {activeTab === "grocery" && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-4">
              Packaging & Size
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Net Weight / Volume"
                value={form.netWeight}
                onChange={(v) => setField("netWeight", v)}
                placeholder="e.g., 500g, 1L, 250ml"
                hint="Displayed on product card"
              />
              <Input
                label="Package Size"
                value={form.packageSize}
                onChange={(v) => setField("packageSize", v)}
                placeholder="e.g., Pack of 6, Box of 12"
              />
              <Input
                label="Units per Carton"
                type="number"
                value={form.unitsPerCarton}
                onChange={(v) => setField("unitsPerCarton", v)}
                placeholder="e.g., 12"
                hint="Shown as '12 units / carton'"
              />
              <Input
                label="Country of Origin"
                value={form.origin}
                onChange={(v) => setField("origin", v)}
                placeholder="e.g., Made in Nigeria"
              />
              <Input
                label="NAFDAC Number"
                value={form.naifdaNumber}
                onChange={(v) => setField("naifdaNumber", v)}
                placeholder="e.g., A1-0001"
                hint="Nigerian food safety reg. number"
              />
              <Input
                label="Shelf Life (days)"
                type="number"
                value={form.shelfLifeDays}
                onChange={(v) => setField("shelfLifeDays", v)}
                placeholder="e.g., 365"
              />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-4">
              Ingredients & Allergens
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ingredients
                </label>
                <textarea
                  value={form.ingredients}
                  onChange={(e) => setField("ingredients", e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 rounded resize-none"
                  placeholder="Wheat flour, sugar, salt, vegetable oil..."
                />
              </div>
              <Input
                label="Allergens (comma-separated)"
                value={form.allergens}
                onChange={(v) => setField("allergens", v)}
                placeholder="Gluten, Nuts, Dairy, Soy"
                hint="Common allergens this product contains"
              />
              <Input
                label="Storage Instructions"
                value={form.storageInstructions}
                onChange={(v) => setField("storageInstructions", v)}
                placeholder="e.g., Store in cool dry place away from direct sunlight"
              />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-4">
              Storage Requirements & Certifications
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Checkbox
                label="🌿 Organic"
                checked={form.isOrganic}
                onChange={(v) => setField("isOrganic", v)}
              />
              <Checkbox
                label="☪️ Halal Certified"
                checked={form.isHalal}
                onChange={(v) => setField("isHalal", v)}
              />
              <Checkbox
                label="✡️ Kosher"
                checked={form.isKosher}
                onChange={(v) => setField("isKosher", v)}
              />
              <Checkbox
                label="🌱 Vegan"
                checked={form.isVegan}
                onChange={(v) => setField("isVegan", v)}
              />
              <Checkbox
                label="Gluten-Free"
                checked={form.isGlutenFree}
                onChange={(v) => setField("isGlutenFree", v)}
              />
              <Checkbox
                label="❄️ Requires Refrigeration"
                checked={form.requiresRefrigeration}
                onChange={(v) => setField("requiresRefrigeration", v)}
              />
              <Checkbox
                label="🧊 Requires Freezing"
                checked={form.requiresFreezing}
                onChange={(v) => setField("requiresFreezing", v)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Nutrition ── */}
      {activeTab === "nutrition" && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-semibold text-gray-900 mb-1">
            Nutritional Information
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Per 100g / 100ml unless otherwise specified
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input
              label="Serving Size"
              value={form.servingSize}
              onChange={(v) => setField("servingSize", v)}
              placeholder="e.g., 30g"
            />
            <Input
              label="Servings per Pack"
              value={form.servingsPerPack}
              onChange={(v) => setField("servingsPerPack", v)}
              placeholder="e.g., ~16 servings"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {(
              [
                { key: "calories", label: "Calories (kcal)" },
                { key: "protein", label: "Protein (g)" },
                { key: "carbs", label: "Carbohydrates (g)" },
                { key: "fat", label: "Total Fat (g)" },
                { key: "fiber", label: "Dietary Fiber (g)" },
                { key: "sodium", label: "Sodium (mg)" },
                { key: "sugar", label: "Sugars (g)" },
              ] as { key: keyof typeof form.nutritionalInfo; label: string }[]
            ).map(({ key, label }) => (
              <Input
                key={key}
                label={label}
                type="number"
                value={form.nutritionalInfo[key]}
                onChange={(v) => setNutri(key, v)}
                placeholder="0"
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Inventory ── */}
      {activeTab === "inventory" && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Inventory Management</h3>

          {/* Scalable product stock context */}
          {form.isScalable && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
              <p className="font-semibold mb-1">
                📦 Scalable product — stock in {form.scaleUnit === "custom" ? form.scaleUnitCustom || "units" : form.scaleUnit}s
              </p>
              <p>
                Enter the total available <strong>{form.scaleUnit === "custom" ? form.scaleUnitCustom || "units" : form.scaleUnit}s</strong> in stock.
                E.g. if you have 10 kg of meat, enter <strong>10</strong>.
                POS and online store will block orders that exceed this amount.
              </p>
              {form.trackInventory && form.maxOrderQty && parseFloat(form.maxOrderQty) > form.stockQuantity && (
                <p className="mt-1.5 text-red-700 font-semibold">
                  ⚠️ Stock ({form.stockQuantity}) is less than max order limit ({form.maxOrderQty}). Increase stock or reduce max order.
                </p>
              )}
            </div>
          )}

          {!isAdmin && productId && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <span className="text-amber-500 mt-0.5">⚠️</span>
              <span>
                Stock quantity changes require admin approval. Your request will be reviewed before the stock is updated.
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={form.isScalable
                ? `Stock (${form.scaleUnit === "custom" ? form.scaleUnitCustom || "units" : form.scaleUnit}s available)`
                : "Stock Quantity"}
              type="number"
              value={form.stockQuantity}
              onChange={(v) => setField("stockQuantity", Number(v))}
              hint={form.isScalable
                ? `Total ${form.scaleUnit === "custom" ? form.scaleUnitCustom || "units" : form.scaleUnit}s on hand (e.g. 10)`
                : undefined}
            />
            <Input
              label="Low Stock Alert Threshold"
              type="number"
              value={form.lowStockThreshold}
              onChange={(v) => setField("lowStockThreshold", Number(v))}
              hint="Alert when stock falls below this"
            />
          </div>
          <div className="space-y-2">
            <Checkbox
              label="Track Inventory"
              checked={form.trackInventory}
              onChange={(v) => setField("trackInventory", v)}
              description="Automatically deduct stock on orders"
            />
            <Checkbox
              label="Allow Backorders"
              checked={form.allowBackorder}
              onChange={(v) => setField("allowBackorder", v)}
              description="Allow customers to order when out of stock"
            />
          </div>
        </div>
      )}

      {/* ── Tab: Shipping ── */}
      {activeTab === "shipping" && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-semibold text-gray-900 mb-1">
            Dimensions & Weight
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Used to calculate table-rate shipping costs for online orders.
          </p>

          {/* Scalable weight context banner */}
          {form.isScalable && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
              <p className="font-semibold mb-1">📦 Scalable product — shipping weight note</p>
              {["kg", "g", "lb"].includes(form.scaleUnit) ? (
                <p>
                  This product is sold by <strong>{form.scaleUnit}</strong>. Enter the shipping weight
                  per <strong>1 {form.scaleUnit}</strong> ordered (usually <strong>1 kg</strong> for
                  kg-sold items). The system will multiply by the ordered quantity to get the total
                  shipment weight.
                </p>
              ) : (
                <p>
                  This product is sold by <strong>{form.scaleUnit === "custom" ? form.scaleUnitCustom || "unit" : form.scaleUnit}</strong>.
                  Enter the estimated shipping weight in kg per <strong>1 {form.scaleUnit === "custom" ? form.scaleUnitCustom || "unit" : form.scaleUnit}</strong> so
                  delivery costs can be calculated correctly.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={
                form.isScalable
                  ? `Shipping Weight per 1 ${form.scaleUnit === "custom" ? form.scaleUnitCustom || "unit" : form.scaleUnit} (kg)`
                  : "Shipping Weight (kg)"
              }
              required
              type="number"
              value={form.weight}
              onChange={(v) => setField("weight", v)}
              placeholder={["kg", "g", "lb"].includes(form.scaleUnit) && form.isScalable ? "1" : "0.5"}
              hint={
                form.isScalable && ["kg", "g", "lb"].includes(form.scaleUnit)
                  ? `Shipping weight per 1 ${form.scaleUnit} ordered (e.g. 1 for 1kg items)`
                  : form.isScalable
                  ? `Weight in kg per 1 ${form.scaleUnit === "custom" ? form.scaleUnitCustom || "unit" : form.scaleUnit} (used in shipping calculation)`
                  : "Required — used to calculate delivery cost"
              }
            />
            <Input
              label="Length (cm)"
              type="number"
              value={form.length}
              onChange={(v) => setField("length", v)}
            />
            <Input
              label="Width (cm)"
              type="number"
              value={form.width}
              onChange={(v) => setField("width", v)}
            />
            <Input
              label="Height (cm)"
              type="number"
              value={form.height}
              onChange={(v) => setField("height", v)}
            />
          </div>
        </div>
      )}

      {/* ── Tab: SEO ── */}
      {activeTab === "seo" && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">SEO Settings</h3>
          <Input
            label="URL Slug"
            value={form.slug}
            onChange={(v) => setField("slug", v)}
            placeholder="auto-generated-from-name"
            hint="The URL path: /products/[slug]"
          />
          <Input
            label="Meta Title"
            value={form.metaTitle}
            onChange={(v) => setField("metaTitle", v)}
            placeholder="Leave blank to use product name"
          />
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Meta Description
            </label>
            <textarea
              value={form.metaDescription}
              onChange={(e) => setField("metaDescription", e.target.value)}
              rows={3}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 rounded resize-none"
              placeholder="Short description for search engines (160 chars)"
              maxLength={160}
            />
          </div>
          <Input
            label="Meta Keywords"
            value={form.metaKeywords}
            onChange={(v) => setField("metaKeywords", v)}
            placeholder="noodles, instant, chicken"
          />
        </div>
      )}

      {/* Save button at bottom */}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-lg"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {productId ? "Save Changes" : "Create Product"}
        </button>
      </div>
    </div>
  );
}
