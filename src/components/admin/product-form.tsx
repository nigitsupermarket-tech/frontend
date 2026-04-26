"use client";

// frontend/src/components/admin/product-form.tsx
// GROCERY EDITION — adds: netWeight, unitsPerCarton, origin, ingredients, allergens,
// nutritionalInfo, storageInstructions, isHalal, isOrganic, naifdaNumber, isOnPromotion

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, X, Tag } from "lucide-react";
import { apiGet, apiPost, apiPut, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { generateSlug } from "@/lib/utils";
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
};

export default function ProductForm({ productId, onSave }: Props) {
  const toast = useToast();
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
    if (!form.name || !form.price || !form.sku || !form.categoryId) {
      toast.error(
        "Please fill in all required fields (Name, SKU, Price, Category)",
      );
      return;
    }

    setSaving(true);
    try {
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
    { id: "grocery", label: "Grocery Details" },
    { id: "nutrition", label: "Nutrition" },
    { id: "inventory", label: "Inventory" },
    { id: "shipping", label: "Shipping" },
    { id: "seo", label: "SEO" },
  ];

  const Input = ({
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
  }) => (
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

  const Checkbox = ({
    label,
    checked,
    onChange,
    description,
  }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    description?: string;
  }) => (
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
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
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
                if (!productId) setField("slug", generateSlug(v));
              }}
              placeholder="e.g., Indomie Chicken Noodles 70g"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="SKU"
                required
                value={form.sku}
                onChange={(v) => setField("sku", v)}
                placeholder="NOODLE-001"
                hint="Unique product code"
              />
              <Input
                label="Barcode (EAN / UPC)"
                value={form.barcode}
                onChange={(v) => setField("barcode", v)}
                placeholder="5901234123457"
                hint="For POS barcode scanning"
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

      {/* ── Tab: Grocery Details ── */}
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Stock Quantity"
              type="number"
              value={form.stockQuantity}
              onChange={(v) => setField("stockQuantity", Number(v))}
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
            Used to calculate table-rate shipping costs
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Weight (kg)"
              type="number"
              value={form.weight}
              onChange={(v) => setField("weight", v)}
              placeholder="0.5"
              hint="e.g., 0.5 for a 500g product"
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
