"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingCart,
  User,
  Menu,
  X,
  Search,
  Heart,
  ChevronRight,
  Package,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  MessageCircle,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn, formatPrice, getProductImage } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useAuthStore } from "@/store/authStore";
import { useSettings } from "@/hooks/useSettings";
import { apiGet } from "@/lib/api";
import { Category, Product } from "@/types";
import Image from "next/image";

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

function SearchDropdown({
  query,
  onNavigate,
}: {
  query: string;
  onNavigate: () => void;
}) {
  const router = useRouter();
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    apiGet<{ success: boolean; data: { products: Product[] } }>("/products", {
      search: query,
      limit: 6,
    })
      .then((res) => setResults(res.data.products ?? []))
      .catch(() => setResults([]))
      .finally(() => setIsLoading(false));
  }, [query]);

  if (query.length < 3) return null;

  return (
    <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[60]">
      {isLoading ? (
        <div className="p-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 items-center animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
              <div className="h-4 w-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="py-10 text-center">
          <Package className="w-9 h-9 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            No results for &ldquo;{query}&rdquo;
          </p>
        </div>
      ) : (
        <>
          <div className="max-h-[352px] overflow-y-auto divide-y divide-gray-50">
            {results.map((product) => (
              <button
                key={product.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  router.push(`/products/${product.slug}`);
                  onNavigate();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <Image
                  src={getProductImage(product.images)}
                  alt={product.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {product.category?.name}
                  </p>
                </div>
                <span className="text-sm font-bold text-brand-700 shrink-0">
                  {formatPrice(product.price)}
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 p-3">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                router.push(`/products?search=${encodeURIComponent(query)}`);
                onNavigate();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-50 text-brand-700 text-sm font-semibold hover:bg-brand-100 transition-colors"
            >
              See all results for &ldquo;{query}&rdquo;
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function CategoryBar({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const activeCatId = searchParams?.get("categorySlug") ?? searchParams?.get("categoryId") ?? "";
  if (!categories.length) return null;

  return (
    <div className="border-t border-gray-100 bg-white/95 backdrop-blur-sm">
      <div className="container">
        {/*
          "All Products" is sticky/fixed on the left.
          The rest of the categories scroll horizontally inside their own container.
        */}
        <div className="flex items-center">
          {/* ── STICKY: All Products + divider — never scrolls ── */}
          <div className="flex items-center flex-shrink-0 bg-white/95">
            <button
              onClick={() => router.push("/products")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all duration-200 border-b-2",
                !activeCatId
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-brand-700 hover:border-brand-300",
              )}
            >
              All Products
            </button>
            <span className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />
          </div>

          {/* ── SCROLLABLE: category list ── */}
          <div
            className="flex items-center gap-0 overflow-x-auto flex-1"
            style={{ scrollbarWidth: "none" }}
          >
            {categories.map((cat) => {
              const isActive = activeCatId === cat.slug || activeCatId === cat.id;
              const hasSvg = !!cat.svgIcon;
              const hasImage = !!cat.image;
              const hasAnyIcon = hasSvg || hasImage;

              return (
                <button
                  key={cat.id}
                  onClick={() => router.push(`/products?categorySlug=${cat.slug}`)}
                  className={cn(
                    "group shrink-0 flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all duration-200 border-b-2",
                    isActive
                      ? "border-brand-600 text-brand-700"
                      : "border-transparent text-gray-500 hover:text-brand-700 hover:border-brand-300",
                  )}
                >
                  {/* Icon — only rendered when an image/SVG is actually set */}
                  {hasAnyIcon && (
                    <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {hasSvg ? (
                        <img
                          src={cat.svgIcon}
                          alt=""
                          aria-hidden
                          className={cn(
                            "w-5 h-5 object-contain transition-all duration-200",
                            isActive
                              ? "[filter:invert(35%)_sepia(90%)_saturate(400%)_hue-rotate(100deg)_brightness(0.85)]"
                              : "opacity-50 grayscale group-hover:opacity-100 group-hover:grayscale-0 group-hover:[filter:invert(35%)_sepia(90%)_saturate(400%)_hue-rotate(100deg)_brightness(0.85)]",
                          )}
                        />
                      ) : (
                        <Image
                          src={cat.image!}
                          alt=""
                          aria-hidden
                          width={20}
                          height={20}
                          className={cn(
                            "w-5 h-5 object-contain rounded transition-all duration-200",
                            isActive
                              ? "opacity-100 scale-110"
                              : "opacity-60 group-hover:opacity-100 group-hover:scale-110",
                          )}
                        />
                      )}
                    </span>
                  )}
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pre-header bar ────────────────────────────────────────────────────────────
function PreHeader() {
  const { settings } = useSettings();
  const s = settings as any;

  const socials = [
    { icon: Facebook, href: s.facebook, label: "Facebook" },
    { icon: Instagram, href: s.instagram, label: "Instagram" },
    { icon: Twitter, href: s.twitter, label: "Twitter" },
    { icon: Linkedin, href: s.linkedin, label: "LinkedIn" },
  ].filter((x) => x.href);

  return (
    <div className="bg-green-800 text-green-100 text-xs py-1.5 hidden md:block">
      <div className="container flex items-center justify-between gap-4">
        {/* Left: contact info */}
        <div className="flex items-center gap-4">
          {(s.contactPhone || s.phone) && (
            <Link
              href={`tel:${s.contactPhone || s.phone}`}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Phone className="w-3 h-3" />
              {s.contactPhone || s.phone}
            </Link>
          )}
          {(s.contactEmail || s.email) && (
            <Link
              href={`mailto:${s.contactEmail || s.email}`}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Mail className="w-3 h-3" />
              {s.contactEmail || s.email}
            </Link>
          )}
          {s.contactWhatsapp && (
            <Link
              href={`https://wa.me/${s.contactWhatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <MessageCircle className="w-3 h-3" />
              WhatsApp
            </Link>
          )}
        </div>

        {/* Right: social + nav links */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-3">
            <Link href="/about" className="hover:text-white transition-colors">
              About
            </Link>
            <Link href="/brands" className="hover:text-white transition-colors">
              Brands
            </Link>
            <Link href="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <Link
              href="/contact"
              className="hover:text-white transition-colors"
            >
              Contact
            </Link>
          </nav>
          {socials.length > 0 && (
            <div className="flex items-center gap-2 border-l border-green-700 pl-4">
              {socials.map(({ icon: Icon, href, label }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="hover:text-white transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 280);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const itemCount = useCartStore((s) => s.itemCount);
  const toggleCart = useCartStore((s) => s.toggleCart);
  const wishlistCount = useWishlistStore((s) => s.itemCount);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { settings } = useSettings();

  useEffect(() => {
    apiGet<{ success: boolean; data: { categories: Category[] } }>(
      "/categories",
    )
      .then((r) =>
        setCategories(
          (r.data.categories ?? []).filter((c) => c.isActive !== false),
        ),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node)
      )
        setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 3) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
      closeSearch();
    }
  };

  const siteName = (settings as any).siteName || "Nigittriple Industry";
  const showBanner =
    (settings as any).showHeaderBanner && (settings as any).headerBanner;

  return (
    <>
      {/* ── Pre-header ── */}
      <PreHeader />

      {showBanner && (
        <div className="bg-amber-500 text-gray-900 text-center py-2 px-4 text-sm font-medium">
          {(settings as any).headerBanner}
        </div>
      )}

      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="border-b border-gray-100">
          <div className="container">
            <div className="flex items-center gap-4 h-16 lg:h-[72px]">
              <Link href="/" className="shrink-0">
                {(settings as any).logo ? (
                  <Image
                    src={(settings as any).logo}
                    alt={siteName}
                    className="h-8 lg:h-10 w-auto object-contain"
                    width={120}
                    height={32}
                  />
                ) : (
                  <span className="font-display text-xl lg:text-2xl font-bold text-brand-700 tracking-tight">
                    Nigit<span className="text-amber-500">Triple</span>
                  </span>
                )}
              </Link>

              {/* Desktop search */}
              <div
                ref={searchWrapRef}
                className="flex-1 relative hidden md:block max-w-xl lg:max-w-2xl mx-auto"
              >
                <form onSubmit={handleSubmit}>
                  <div
                    className={cn(
                      "flex items-center gap-2.5 border rounded-2xl px-4 py-2.5 transition-all duration-200",
                      searchOpen
                        ? "border-brand-400 bg-white shadow-lg ring-2 ring-brand-100"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white",
                    )}
                  >
                    <Search
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        searchOpen ? "text-brand-600" : "text-gray-400",
                      )}
                    />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => setSearchOpen(true)}
                      placeholder="Search products, categories, brands…"
                      className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none min-w-0"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          inputRef.current?.focus();
                        }}
                        className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </form>
                {searchOpen && debouncedQuery.length >= 3 && (
                  <SearchDropdown
                    query={debouncedQuery}
                    onNavigate={closeSearch}
                  />
                )}
                {searchOpen && query.length > 0 && query.length < 3 && (
                  <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 z-[60]">
                    <p className="text-xs text-gray-400">
                      Type {3 - query.length} more character
                      {3 - query.length !== 1 ? "s" : ""} to search…
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center shrink-0 ml-auto gap-1">
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setSearchOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className="md:hidden p-2 rounded-xl text-gray-500 hover:text-brand-700 hover:bg-gray-50 transition-colors"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>

                <Link
                  href="/wishlist"
                  className="relative p-2 rounded-xl text-gray-500 hover:text-brand-700 hover:bg-gray-50 transition-colors"
                  aria-label="Wishlist"
                >
                  <Heart
                    className={cn(
                      "w-5 h-5 transition-all",
                      wishlistCount > 0 && "fill-red-500 text-red-500",
                    )}
                  />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </span>
                  )}
                </Link>

                <button
                  onClick={toggleCart}
                  className="relative p-2 rounded-xl text-gray-500 hover:text-brand-700 hover:bg-gray-50 transition-colors"
                  aria-label="Cart"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  )}
                </button>

                {isAuthenticated && user ? (
                  <Link
                    href="/account"
                    className="hidden lg:flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-brand-700 hover:bg-gray-50 transition-colors"
                  >
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name}
                        className="w-6 h-6 rounded-full object-cover ring-2 ring-brand-100"
                        width={24}
                        height={24}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-brand-700">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="max-w-[72px] truncate">
                      {user.name?.split(" ")[0]}
                    </span>
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="hidden lg:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Sign in
                  </Link>
                )}

                <button
                  onClick={() => setMobileOpen((o) => !o)}
                  className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-brand-700 hover:bg-gray-50 transition-colors"
                  aria-label="Toggle menu"
                >
                  {mobileOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <CategoryBar categories={categories} />

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white shadow-lg">
            <div className="container pt-3 pb-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (query.trim().length >= 3) {
                    router.push(
                      `/products?search=${encodeURIComponent(query.trim())}`,
                    );
                    setMobileOpen(false);
                    setQuery("");
                  }
                }}
              >
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5">
                  <Search className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search products…"
                    className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                  />
                </div>
              </form>
            </div>
            <nav className="container pb-4 flex flex-col gap-1">
              {[
                { href: "/products", label: "All Products" },
                { href: "/brands", label: "Brands" },
                { href: "/blog", label: "Blog" },
                { href: "/about", label: "About" },
                { href: "/contact", label: "Contact" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    pathname === href
                      ? "bg-brand-50 text-brand-700"
                      : "text-gray-600 hover:bg-gray-50",
                  )}
                >
                  {label}
                </Link>
              ))}
              <div className="border-t border-gray-100 mt-2 pt-2 space-y-1">
                <Link
                  href="/wishlist"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Heart
                    className={cn(
                      "w-4 h-4",
                      wishlistCount > 0 && "fill-red-500 text-red-500",
                    )}
                  />
                  Wishlist{" "}
                  {wishlistCount > 0 && (
                    <span className="ml-auto text-xs font-bold text-red-500">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
                {isAuthenticated && user ? (
                  <Link
                    href="/account"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <User className="w-4 h-4" /> My Account
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold"
                  >
                    <User className="w-4 h-4" /> Sign In
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
