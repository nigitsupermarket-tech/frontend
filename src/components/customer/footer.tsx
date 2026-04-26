"use client";

import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

const shopLinks = [
  { label: "All Products", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "New Arrivals", href: "/products?isNewArrival=true" },
  { label: "Featured", href: "/products?isFeatured=true" },
];

const serviceLinks = [
  { label: "About Us", href: "/about" },
  { label: "Our Team", href: "/team" },
  { label: "Strong Points", href: "/strong-points" },
  { label: "Our Values", href: "/our-values" },
  { label: "Reviews", href: "/reviews" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact Us", href: "/contact" },
  { label: "Blog", href: "/blog" },
];

const accountLinks = [
  { label: "My Account", href: "/account" },
  { label: "Order History", href: "/account/orders" },
  { label: "Saved Addresses", href: "/account/addresses" },
];

export function Footer() {
  // Shared cache — no network request if settings already loaded by Header or Providers
  const { settings } = useSettings();

  const siteName = (settings as any).siteName || "Nigittriple Industry";

  const socialLinks = [
    {
      icon: Facebook,
      href: (settings as any).facebook || "#",
      label: "Facebook",
      show: !!(settings as any).facebook,
    },
    {
      icon: Instagram,
      href: (settings as any).instagram || "#",
      label: "Instagram",
      show: !!(settings as any).instagram,
    },
    {
      icon: Twitter,
      href: (settings as any).twitter || "#",
      label: "Twitter",
      show: !!(settings as any).twitter,
    },
    {
      icon: Linkedin,
      href: (settings as any).linkedin || "#",
      label: "LinkedIn",
      show: !!(settings as any).linkedin,
    },
  ].filter((l) => l.show);

  // ✅ No isLoading guard — render immediately with defaults.
  // Settings fill in when the cache resolves (usually instant on page 2+).

  return (
    <footer className="bg-green-800 text-green-100 mt-auto">
      <div className="container py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <span className="font-display text-2xl font-bold text-white">
                Nigit<span className="text-amber-400">Triple</span>
              </span>
            </Link>
            <p className="text-sm text-green-200 leading-relaxed mb-6">
              Port Harcourt&apos;s premier grocery supermarket — quality
              products, trusted brands, fast delivery across Rivers State.
            </p>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map(({ icon: Icon, href, label }) => (
                  <Link
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-9 h-9 rounded-lg bg-green-700 flex items-center justify-center text-green-300 hover:text-white hover:bg-green-600 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white font-semibold mb-4 uppercase text-xs tracking-widest">
              Shop
            </h4>
            <ul className="space-y-2">
              {shopLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-green-200 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <h4 className="text-white font-semibold mt-6 mb-4 uppercase text-xs tracking-widest">
              Account
            </h4>
            <ul className="space-y-2">
              {accountLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-green-200 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4 uppercase text-xs tracking-widest">
              Company
            </h4>
            <ul className="space-y-2">
              {serviceLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-green-200 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Newsletter */}
          <div>
            <h4 className="text-white font-semibold mb-4 uppercase text-xs tracking-widest">
              Contact
            </h4>
            <ul className="space-y-3">
              {(settings as any).contactAddress && (
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-green-200">
                    {(settings as any).contactAddress}
                  </span>
                </li>
              )}
              {(settings as any).contactPhone && (
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                  <Link
                    href={`tel:${(settings as any).contactPhone}`}
                    className="text-sm text-green-200 hover:text-white transition-colors"
                  >
                    {(settings as any).contactPhone}
                  </Link>
                </li>
              )}
              {(settings as any).contactEmail && (
                <li className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                  <Link
                    href={`mailto:${(settings as any).contactEmail}`}
                    className="text-sm text-green-200 hover:text-white transition-colors"
                  >
                    {(settings as any).contactEmail}
                  </Link>
                </li>
              )}
              {/* Fallback to top-level email/phone if contact-prefixed not set */}
              {!(settings as any).contactPhone && (settings as any).phone && (
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                  <Link
                    href={`tel:${(settings as any).phone}`}
                    className="text-sm text-green-200 hover:text-white transition-colors"
                  >
                    {(settings as any).phone}
                  </Link>
                </li>
              )}
              {!(settings as any).contactEmail && (settings as any).email && (
                <li className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                  <Link
                    href={`mailto:${(settings as any).email}`}
                    className="text-sm text-green-200 hover:text-white transition-colors"
                  >
                    {(settings as any).email}
                  </Link>
                </li>
              )}
            </ul>

            {/* Newsletter */}
            <div className="mt-6">
              <p className="text-sm font-medium text-white mb-2">
                Stay updated
              </p>
              <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-3 py-2 bg-green-700 border border-green-600 rounded-lg text-sm text-white placeholder:text-green-400 focus:outline-none focus:border-amber-400 transition-colors"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-amber-400 text-gray-900 rounded-lg text-sm font-bold hover:bg-amber-500 transition-colors"
                >
                  →
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-green-700 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-green-300">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <p>
              © {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
            <span className="hidden sm:inline text-green-600">•</span>
            <p>
              Developed by{" "}
              <Link
                href="https://calstins.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 transition-colors font-medium"
              >
                Calstins Ltd
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
