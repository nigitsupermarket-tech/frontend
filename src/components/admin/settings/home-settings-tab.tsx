"use client";
// frontend/src/app/(admin)/admin/settings/home/page.tsx

import { useState, useEffect } from "react";
import { Save, Loader2, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { apiGet, apiPut, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { PageLoader } from "@/components/shared/loading-spinner";
import { DragDropMediaUploader } from "@/components/shared/drag-drop-media-uploader";
import Image from "next/image";

interface MediaItem {
  url: string;
  publicId?: string;
  type: "image" | "video";
}

interface HeroSlide {
  id?: string;
  heading?: string;
  text?: string;
  buttonText?: string;
  buttonUrl?: string;
  media: MediaItem[];
  animation?: "fade" | "slide" | "zoom" | "none";
  darkOverlay?: boolean;
  overlayOpacity?: number;
}

interface HeroBanner {
  id?: string;
  heading?: string;
  text?: string;
  buttonText?: string;
  buttonUrl?: string;
  media: MediaItem[];
  darkOverlay?: boolean;
  overlayOpacity?: number;
}

interface TrustBadge {
  icon: string;
  title: string;
  description: string;
}

const iconOptions = [
  "star",
  "shield",
  "truck",
  "headphones",
  "award",
  "clock",
  "creditCard",
  "package",
  "checkCircle",
  "gift",
  "dollarSign",
  "lock",
];

const animationOptions = [
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "zoom", label: "Zoom" },
  { value: "none", label: "None" },
];

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ── Reusable dark overlay control ─────────────────────────────────────────────
function DarkOverlayControl({
  enabled,
  opacity,
  defaultOpacity,
  onToggle,
  onOpacityChange,
}: {
  enabled: boolean;
  opacity: number;
  defaultOpacity: number;
  onToggle: () => void;
  onOpacityChange: (val: number) => void;
}) {
  return (
    <div className="space-y-3 pt-3 border-t border-gray-100">
      {/* Toggle row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-700">Dark Overlay</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Darken the background to improve text readability
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
            enabled ? "bg-gray-900" : "bg-gray-200"
          }`}
        >
          <div
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Opacity slider — only visible when overlay is on */}
      {enabled && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-gray-600">
              Overlay Intensity
            </p>
            <span className="text-[11px] font-bold text-gray-700">
              {Math.round(opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(opacity * 100)}
            onChange={(e) => onOpacityChange(parseInt(e.target.value) / 100)}
            className="w-full accent-gray-900"
          />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>0% (none)</span>
            <span>100% (full black)</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminHomeSettingsTab() {
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [trustBadges, setTrustBadges] = useState<TrustBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await apiGet<any>("/settings");
      const settings = res.data.settings;

      const slides = (settings.heroSlides || []).map((slide: any) => ({
        ...slide,
        id: slide.id || generateId(),
        media:
          slide.media ||
          (slide.image ? [{ url: slide.image, type: "image" }] : []),
        animation: slide.animation || "fade",
        darkOverlay: slide.darkOverlay ?? true,
        overlayOpacity: slide.overlayOpacity ?? 0.45,
      }));

      const banners = (settings.heroBanners || []).map((banner: any) => ({
        ...banner,
        id: banner.id || generateId(),
        media:
          banner.media ||
          (banner.image ? [{ url: banner.image, type: "image" }] : []),
        darkOverlay: banner.darkOverlay ?? true,
        overlayOpacity: banner.overlayOpacity ?? 0.55,
      }));

      setHeroSlides(slides);
      setHeroBanners(banners);
      setTrustBadges(settings.trustBadges || []);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const saveHeroSlides = async () => {
    setSaving(true);
    try {
      const slidesPayload = heroSlides.map((slide) => ({
        ...slide,
        image: slide.media[0]?.url || "",
        videoUrl:
          slide.media[0]?.type === "video" ? slide.media[0].url : undefined,
      }));

      await apiPut("/settings/hero-slides", { heroSlides: slidesPayload });
      toast("Hero slides saved", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const saveHeroBanners = async () => {
    setSaving(true);
    try {
      const bannersPayload = heroBanners.map((banner) => ({
        ...banner,
        image: banner.media[0]?.url || "",
      }));

      await apiPut("/settings/hero-banners", { heroBanners: bannersPayload });
      toast("Hero banners saved", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const saveTrustBadges = async () => {
    setSaving(true);
    try {
      await apiPut("/settings/trust-badges", { trustBadges });
      toast("Trust badges saved", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const addSlide = () => {
    setHeroSlides([
      ...heroSlides,
      {
        id: generateId(),
        media: [],
        animation: "fade",
        darkOverlay: true,
        overlayOpacity: 0.45,
      },
    ]);
  };

  const updateSlide = (index: number, field: keyof HeroSlide, value: any) => {
    const updated = [...heroSlides];
    updated[index] = { ...updated[index], [field]: value };
    setHeroSlides(updated);
  };

  const removeSlide = (index: number) => {
    setHeroSlides(heroSlides.filter((_, i) => i !== index));
  };

  const addBanner = () => {
    if (heroBanners.length >= 2) {
      toast("Maximum 2 banners allowed", "error");
      return;
    }
    setHeroBanners([
      ...heroBanners,
      {
        id: generateId(),
        media: [],
        darkOverlay: true,
        overlayOpacity: 0.55,
      },
    ]);
  };

  const updateBanner = (index: number, field: keyof HeroBanner, value: any) => {
    const updated = [...heroBanners];
    updated[index] = { ...updated[index], [field]: value };
    setHeroBanners(updated);
  };

  const removeBanner = (index: number) => {
    setHeroBanners(heroBanners.filter((_, i) => i !== index));
  };

  const addTrustBadge = () => {
    setTrustBadges([
      ...trustBadges,
      { icon: "star", title: "", description: "" },
    ]);
  };

  const updateTrustBadge = (
    index: number,
    field: keyof TrustBadge,
    value: string,
  ) => {
    const updated = [...trustBadges];
    updated[index] = { ...updated[index], [field]: value };
    setTrustBadges(updated);
  };

  const removeTrustBadge = (index: number) => {
    setTrustBadges(trustBadges.filter((_, i) => i !== index));
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 transition-colors";

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-6 max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Homepage Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Customize your hero section and trust badges
          </p>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium"
        >
          {showPreview ? (
            <>
              <EyeOff className="w-4 h-4" /> Hide Preview
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" /> Show Preview
            </>
          )}
        </button>
      </div>

      {/* Preview Section */}
      {showPreview && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Live Preview
          </h3>
          <div className="border rounded-xl overflow-hidden">
            <HeroPreview slides={heroSlides} banners={heroBanners} />
          </div>
          <div className="mt-4 border-t pt-4">
            <h4 className="text-xs font-semibold text-gray-700 mb-3">
              Trust Badges Preview
            </h4>
            <TrustBadgesPreview badges={trustBadges} />
          </div>
        </div>
      )}

      {/* ── Hero Slides ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Hero Slides</h2>
            <p className="text-sm text-gray-500">
              Large slider with images or videos
            </p>
          </div>
          <button
            onClick={addSlide}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" /> Add Slide
          </button>
        </div>

        <div className="space-y-4">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.id || index}
              className="border border-gray-200 rounded-xl p-4 space-y-3"
            >
              {/* Card header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Slide {index + 1}
                  {slide.heading ? `: ${slide.heading.substring(0, 40)}` : ""}
                </span>
                <button
                  onClick={() => removeSlide(index)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <DragDropMediaUploader
                key={`slide-media-${slide.id}`}
                value={slide.media}
                onChange={(media) => updateSlide(index, "media", media)}
                maxFiles={1}
                folder={`hero-slides/slide-${index + 1}`}
                accept="both"
                label="Background Media *"
                helperText="Upload image or video, or paste YouTube/Vimeo URL"
                showPreview={true}
              />

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Heading (optional)
                  </label>
                  <input
                    value={slide.heading || ""}
                    onChange={(e) =>
                      updateSlide(index, "heading", e.target.value)
                    }
                    className={inputCls}
                    placeholder="Empowering Business Women"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Animation Effect
                  </label>
                  <select
                    value={slide.animation || "fade"}
                    onChange={(e) =>
                      updateSlide(index, "animation", e.target.value)
                    }
                    className={inputCls + " bg-white"}
                  >
                    {animationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description Text (optional)
                </label>
                <textarea
                  value={slide.text || ""}
                  onChange={(e) => updateSlide(index, "text", e.target.value)}
                  rows={2}
                  className={inputCls + " resize-none"}
                  placeholder="Premium office supplies and business tools..."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Button Text (optional)
                  </label>
                  <input
                    value={slide.buttonText || ""}
                    onChange={(e) =>
                      updateSlide(index, "buttonText", e.target.value)
                    }
                    className={inputCls}
                    placeholder="Shop Now"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Button URL (optional)
                  </label>
                  <input
                    value={slide.buttonUrl || ""}
                    onChange={(e) =>
                      updateSlide(index, "buttonUrl", e.target.value)
                    }
                    className={inputCls}
                    placeholder="/products"
                  />
                </div>
              </div>

              {/* ✅ Dark overlay controls — now lives here, not in site/page.tsx */}
              <DarkOverlayControl
                enabled={slide.darkOverlay ?? true}
                opacity={slide.overlayOpacity ?? 0.45}
                defaultOpacity={0.45}
                onToggle={() =>
                  updateSlide(
                    index,
                    "darkOverlay",
                    !(slide.darkOverlay ?? true),
                  )
                }
                onOpacityChange={(val) =>
                  updateSlide(index, "overlayOpacity", val)
                }
              />
            </div>
          ))}

          {heroSlides.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">
                No slides added yet. Click "Add Slide" to get started.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={saveHeroSlides}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Hero Slides
        </button>
      </div>

      {/* ── Hero Banners ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Hero Banners
            </h2>
            <p className="text-sm text-gray-500">
              Small promotional banners (max 2)
            </p>
          </div>
          <button
            onClick={addBanner}
            disabled={heroBanners.length >= 2}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add Banner
          </button>
        </div>

        <div className="space-y-4">
          {heroBanners.map((banner, index) => (
            <div
              key={banner.id || index}
              className="border border-gray-200 rounded-xl p-4 space-y-3"
            >
              {/* Card header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Banner {index + 1}
                  {banner.heading ? `: ${banner.heading.substring(0, 40)}` : ""}
                </span>
                <button
                  onClick={() => removeBanner(index)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <DragDropMediaUploader
                key={`banner-media-${banner.id}`}
                value={banner.media}
                onChange={(media) => updateBanner(index, "media", media)}
                maxFiles={1}
                folder={`hero-banners/banner-${index + 1}`}
                accept="image"
                label="Background Image *"
                showPreview={true}
              />

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Heading (optional)
                  </label>
                  <input
                    value={banner.heading || ""}
                    onChange={(e) =>
                      updateBanner(index, "heading", e.target.value)
                    }
                    className={inputCls}
                    placeholder="Coming Soon"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Text (optional)
                  </label>
                  <input
                    value={banner.text || ""}
                    onChange={(e) =>
                      updateBanner(index, "text", e.target.value)
                    }
                    className={inputCls}
                    placeholder="New products arriving"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Button Text (optional)
                  </label>
                  <input
                    value={banner.buttonText || ""}
                    onChange={(e) =>
                      updateBanner(index, "buttonText", e.target.value)
                    }
                    className={inputCls}
                    placeholder="Order Now"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Button URL (optional)
                  </label>
                  <input
                    value={banner.buttonUrl || ""}
                    onChange={(e) =>
                      updateBanner(index, "buttonUrl", e.target.value)
                    }
                    className={inputCls}
                    placeholder="/products"
                  />
                </div>
              </div>

              {/* ✅ Dark overlay controls — now lives here, not in site/page.tsx */}
              <DarkOverlayControl
                enabled={banner.darkOverlay ?? true}
                opacity={banner.overlayOpacity ?? 0.55}
                defaultOpacity={0.55}
                onToggle={() =>
                  updateBanner(
                    index,
                    "darkOverlay",
                    !(banner.darkOverlay ?? true),
                  )
                }
                onOpacityChange={(val) =>
                  updateBanner(index, "overlayOpacity", val)
                }
              />
            </div>
          ))}

          {heroBanners.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No banners added yet.</p>
            </div>
          )}
        </div>

        <button
          onClick={saveHeroBanners}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Hero Banners
        </button>
      </div>

      {/* ── Trust Badges ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Trust Badges
            </h2>
            <p className="text-sm text-gray-500">
              Display key features and benefits
            </p>
          </div>
          <button
            onClick={addTrustBadge}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" /> Add Badge
          </button>
        </div>

        <div className="space-y-4">
          {trustBadges.map((badge, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  Badge {index + 1}
                </span>
                <button
                  onClick={() => removeTrustBadge(index)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Icon
                  </label>
                  <select
                    value={badge.icon}
                    onChange={(e) =>
                      updateTrustBadge(index, "icon", e.target.value)
                    }
                    className={inputCls + " bg-white"}
                  >
                    {iconOptions.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    value={badge.title}
                    onChange={(e) =>
                      updateTrustBadge(index, "title", e.target.value)
                    }
                    className={inputCls}
                    placeholder="Free Delivery"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    value={badge.description}
                    onChange={(e) =>
                      updateTrustBadge(index, "description", e.target.value)
                    }
                    className={inputCls}
                    placeholder="On orders over ₦50,000"
                    required
                  />
                </div>
              </div>
            </div>
          ))}

          {trustBadges.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No trust badges added yet.</p>
            </div>
          )}
        </div>

        <button
          onClick={saveTrustBadges}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Trust Badges
        </button>
      </div>
    </div>
  );
}

// ── Preview Components ────────────────────────────────────────────────────────

function HeroPreview({
  slides,
  banners,
}: {
  slides: HeroSlide[];
  banners: HeroBanner[];
}) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (slides.length === 0) {
    return (
      <div className="h-64 bg-gray-100 flex items-center justify-center text-gray-400">
        No slides to preview
      </div>
    );
  }

  const slide = slides[currentSlide];
  const media = slide.media[0];
  const overlayStyle = slide.darkOverlay
    ? { backgroundColor: `rgba(0,0,0,${slide.overlayOpacity ?? 0.45})` }
    : {};

  return (
    <div className="grid lg:grid-cols-3 gap-2 bg-gray-50 p-2">
      <div className="lg:col-span-2 relative h-64 rounded-lg overflow-hidden bg-gray-900">
        {media?.type === "video" ? (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <p className="text-sm">Video: {media.url}</p>
          </div>
        ) : media?.url ? (
          <Image
            src={media.url}
            alt="Preview"
            className="w-full h-full object-cover"
            width={1200}
            height={800}
          />
        ) : (
          <div className="w-full h-full bg-gray-700" />
        )}
        {/* ✅ Preview respects the overlay settings */}
        <div className="absolute inset-0" style={overlayStyle} />
        <div className="absolute inset-0 flex items-center p-6">
          <div>
            {slide.heading && (
              <h1 className="text-2xl font-bold text-white mb-2">
                {slide.heading}
              </h1>
            )}
            {slide.text && (
              <p className="text-white/90 text-sm mb-3">{slide.text}</p>
            )}
            {slide.buttonText && (
              <button className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm">
                {slide.buttonText}
              </button>
            )}
          </div>
        </div>
        {/* Slide pagination dots */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentSlide ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-rows-2 gap-2">
        {banners.slice(0, 2).map((banner, i) => {
          const bannerOverlay = banner.darkOverlay
            ? {
                backgroundColor: `rgba(0,0,0,${banner.overlayOpacity ?? 0.55})`,
              }
            : {};
          return (
            <div
              key={i}
              className="relative rounded-lg overflow-hidden h-full bg-gray-800"
            >
              {banner.media[0]?.url && (
                <Image
                  src={banner.media[0].url}
                  alt="Banner"
                  className="w-full h-full object-cover"
                  width={600}
                  height={400}
                />
              )}
              {/* ✅ Preview respects banner overlay settings */}
              <div className="absolute inset-0" style={bannerOverlay} />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                {banner.heading && (
                  <p className="text-white font-bold text-sm">
                    {banner.heading}
                  </p>
                )}
                {banner.text && (
                  <p className="text-white/90 text-xs">{banner.text}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrustBadgesPreview({ badges }: { badges: TrustBadge[] }) {
  if (badges.length === 0) {
    return (
      <div className="text-center text-gray-400 text-sm py-4">
        No badges to preview
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {badges.map((badge, i) => (
        <div
          key={i}
          className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-xs text-brand-600">{badge.icon}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">{badge.title}</p>
            <p className="text-[10px] text-gray-500">{badge.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
