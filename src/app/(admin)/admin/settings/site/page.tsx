"use client";
// frontend/src/app/(admin)/admin/settings/site/page.tsx

import { useState, useEffect, useRef } from "react";
import { Save, Loader2, Upload, X, Info } from "lucide-react";
import { apiGet, apiPut, apiUpload, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { PageLoader } from "@/components/shared/loading-spinner";

// ── Image spec hint ───────────────────────────────────────────────────────────
function SpecHint({
  recommended,
  maxSize,
  formats,
  tip,
}: {
  recommended: string;
  maxSize: string;
  formats: string;
  tip?: string;
}) {
  return (
    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />
      <div className="space-y-0.5 leading-relaxed">
        <p>
          • Recommended: <strong>{recommended}</strong>
        </p>
        <p>
          • Max size: <strong>{maxSize}</strong>
        </p>
        <p>
          • Formats: <strong>{formats}</strong>
        </p>
        {tip && <p className="text-blue-600 italic mt-1">💡 {tip}</p>}
      </div>
    </div>
  );
}

// ── Image upload field (drag-drop + URL paste) ────────────────────────────────
function ImageUploadField({
  label,
  value,
  onChange,
  folder,
  recommended,
  maxSizeKB,
  formats,
  tip,
  previewClass = "w-24 h-24",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
  recommended: string;
  maxSizeKB: number;
  formats: string;
  tip?: string;
  previewClass?: string;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (file: File) => {
    if (file.size > maxSizeKB * 1024) {
      toast(
        `File is too large. Max ${maxSizeKB >= 1024 ? `${maxSizeKB / 1024} MB` : `${maxSizeKB} KB`}`,
        "error",
      );
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("images", file);
      fd.append("folder", folder);
      const res = await apiUpload<any>("/upload/images", fd);
      const url = res.data?.images?.[0]?.url;
      if (url) {
        onChange(url);
        toast("Uploaded!", "success");
      }
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setUploading(false);
    }
  };

  const pick = (files: FileList | null) => {
    if (files?.[0]) upload(files[0]);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <SpecHint
        recommended={recommended}
        maxSize={
          maxSizeKB >= 1024 ? `${maxSizeKB / 1024} MB` : `${maxSizeKB} KB`
        }
        formats={formats}
        tip={tip}
      />

      <div className="flex items-start gap-4">
        {/* Preview box */}
        <div
          className={`${previewClass} rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 relative group`}
        >
          {value ? (
            <>
              <img
                src={value}
                alt={label}
                className="w-full h-full object-contain p-1"
              />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <Upload className="w-5 h-5 text-gray-300" />
          )}
        </div>

        {/* Upload + URL paste */}
        <div className="flex-1 space-y-2">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pick(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors select-none ${
              dragOver
                ? "border-brand-400 bg-brand-50"
                : "border-gray-200 hover:border-brand-300 hover:bg-gray-50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
              onChange={(e) => pick(e.target.files)}
              disabled={uploading}
              className="hidden"
            />
            {uploading ? (
              <span className="flex items-center justify-center gap-2 text-brand-600 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
              </span>
            ) : (
              <p className="text-sm text-gray-500">
                <span className="font-medium text-brand-600">
                  Click to upload
                </span>{" "}
                or drag & drop
              </p>
            )}
          </div>

          {/* URL paste */}
          <div className="flex gap-2">
            <input
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Or paste image URL…"
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-brand-500"
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="px-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminSiteSettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    apiGet<any>("/settings")
      .then((res) => setSettings(res.data?.settings ?? {}))
      .catch(() => toast("Failed to load settings", "error"))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPut("/settings", settings);
      toast("Settings saved", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const set = (k: string, v: any) =>
    setSettings((p: any) => ({ ...p, [k]: v }));

  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 transition-colors";

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Site Identity</h1>
        <p className="text-sm text-gray-500 mt-1">
          Controls your brand name, logo, SEO metadata, and announcements.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Branding ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Branding</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Site Name *
            </label>
            <input
              value={settings.siteName || ""}
              onChange={(e) => set("siteName", e.target.value)}
              className={inputCls}
              placeholder="Nigittriple Industry"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Site Description
            </label>
            <textarea
              value={settings.siteDescription || ""}
              onChange={(e) => set("siteDescription", e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Premium business solutions for the modern business woman…"
            />
          </div>

          {/* Logo */}
          <ImageUploadField
            label="Logo"
            value={settings.logo || ""}
            onChange={(url) => set("logo", url)}
            folder="branding/logo"
            recommended="400 × 120 px  (landscape, transparent bg)"
            maxSizeKB={500}
            formats="PNG · SVG · WebP"
            tip="Use PNG or SVG with a transparent background so it looks good on any header color."
            previewClass="w-40 h-14"
          />

          {/* Favicon */}
          <ImageUploadField
            label="Favicon"
            value={settings.favicon || ""}
            onChange={(url) => set("favicon", url)}
            folder="branding/favicon"
            recommended="64 × 64 px  (square)"
            maxSizeKB={100}
            formats="ICO · PNG · SVG"
            tip="Must be square. Keep it simple — it renders at 16×16 px in browser tabs."
            previewClass="w-14 h-14"
          />
        </div>

        {/* ── SEO ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">SEO & Meta</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Meta Title
            </label>
            <input
              value={settings.metaTitle || ""}
              onChange={(e) => set("metaTitle", e.target.value)}
              className={inputCls}
              placeholder="Port Harcourt's Premier Supermarket | Nigittriple Industry"
            />
            <p
              className={`mt-1 text-xs ${(settings.metaTitle || "").length > 60 ? "text-red-500" : "text-gray-400"}`}
            >
              {(settings.metaTitle || "").length} / 60 chars recommended
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Meta Description
            </label>
            <textarea
              value={settings.metaDescription || ""}
              onChange={(e) => set("metaDescription", e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Premium office supplies, industrial equipment and business tools for ambitious women across Nigeria."
            />
            <p
              className={`mt-1 text-xs ${(settings.metaDescription || "").length > 160 ? "text-red-500" : "text-gray-400"}`}
            >
              {(settings.metaDescription || "").length} / 160 chars recommended
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Meta Keywords
            </label>
            <input
              value={settings.metaKeywords || ""}
              onChange={(e) => set("metaKeywords", e.target.value)}
              className={inputCls}
              placeholder="commercial equipment, supermarket shelves, industrial kitchen, Nigeria…"
            />
            <p className="mt-1 text-xs text-gray-400">Separate with commas</p>
          </div>

          {/* Social / OG image */}
          <ImageUploadField
            label="Social Share Image (OG Image)"
            value={settings.metaImage || ""}
            onChange={(url) => set("metaImage", url)}
            folder="branding/og"
            recommended="1200 × 630 px  (16:9 landscape)"
            maxSizeKB={1024}
            formats="JPG · PNG · WebP"
            tip="Shown when your site is shared on WhatsApp, Facebook, Twitter, etc. Use bold text on your image so it stands out in feeds."
            previewClass="w-40 h-20"
          />
        </div>

        {/* ── Announcements ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Header Announcement</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Banner Text
            </label>
            <input
              value={settings.headerBanner || ""}
              onChange={(e) => set("headerBanner", e.target.value)}
              className={inputCls}
              placeholder="🚚 Free delivery on orders over ₦50,000!"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showHeaderBanner ?? false}
              onChange={(e) => set("showHeaderBanner", e.target.checked)}
              className="rounded border-gray-300 text-brand-600"
            />
            <span className="text-sm font-medium text-gray-700">
              Show announcement banner
            </span>
          </label>
        </div>

        {/* ── Pricing Visibility ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Pricing Visibility</h2>
          <p className="text-sm text-gray-500">
            When enabled, product prices are hidden across the store and
            replaced with a <strong>"Request a Quote"</strong> button. Customers
            will submit a quote request with their quantity, email, and message.
          </p>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.hidePricing ?? false}
                onChange={(e) => set("hidePricing", e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-11 h-6 rounded-full transition-colors ${
                  settings.hidePricing ? "bg-brand-600" : "bg-gray-200"
                }`}
              />
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.hidePricing ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">
                Hide pricing — use "Request a Quote" instead
              </span>
              <p className="text-xs text-gray-400 mt-0.5">
                All price displays will be replaced with a quote request form
              </p>
            </div>
          </label>
        </div>

        {/* ── Maintenance ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Maintenance & Access</h2>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.maintenanceMode ?? false}
              onChange={(e) => set("maintenanceMode", e.target.checked)}
              className="rounded border-gray-300 text-brand-600"
            />
            <span className="text-sm font-medium text-gray-700">
              Enable maintenance mode
            </span>
          </label>

          {settings.maintenanceMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Maintenance Message
              </label>
              <textarea
                value={settings.maintenanceMessage || ""}
                onChange={(e) => set("maintenanceMessage", e.target.value)}
                rows={2}
                className={`${inputCls} resize-none`}
                placeholder="We're making improvements. We'll be back shortly!"
              />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allowGuestCheckout ?? true}
              onChange={(e) => set("allowGuestCheckout", e.target.checked)}
              className="rounded border-gray-300 text-brand-600"
            />
            <span className="text-sm font-medium text-gray-700">
              Allow guest checkout
            </span>
          </label>
        </div>

        {/* ── Analytics ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Analytics & Tracking</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Google Analytics ID
              </label>
              <input
                value={settings.googleAnalyticsId || ""}
                onChange={(e) => set("googleAnalyticsId", e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Facebook Pixel ID
              </label>
              <input
                value={settings.facebookPixelId || ""}
                onChange={(e) => set("facebookPixelId", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Settings
        </button>
      </form>
    </div>
  );
}
