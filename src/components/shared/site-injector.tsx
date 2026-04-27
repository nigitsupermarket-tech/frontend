"use client";

// src/components/shared/site-injector.tsx
//
// Reads site settings (via the cached useSettings hook — zero extra API calls)
// and applies everything dynamically to the document:
//
//   • <title> + Open Graph title
//   • <meta description> + OG description
//   • <meta keywords>
//   • <link rel="icon"> (favicon)
//   • CSS variables (--brand-*, --gold-*) from primaryColor / secondaryColor / accentColor
//   • Google Analytics 4 script (googleAnalyticsId)
//   • Meta/Facebook Pixel script (facebookPixelId)
//
// Placed inside <Providers> so it shares the same settings cache.
// Nothing in this component causes a network request — useSettings() is already
// primed by Providers before this runs.

import { useEffect } from "react";
import Script from "next/script";
import { useSettings } from "@/hooks/useSettings";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a CSS hex colour (#16a34a) or rgb string to "R G G" space-separated
 *  format used by Tailwind CSS variables (e.g. "22 163 74") */
function hexToRgbVars(hex: string): string | null {
  const cleaned = hex.replace(/^#/, "");
  if (cleaned.length !== 6) return null;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return `${r} ${g} ${b}`;
}

/** Generate a full Tailwind-compatible CSS variable block for a colour.
 *  Given a base hex we generate shades by lightening/darkening the base. */
function generateBrandVars(base: string, prefix: string): string {
  const mid = hexToRgbVars(base);
  if (!mid) return "";

  // Simple shade generation: we can't do full Tailwind-accurate shading without
  // a colour lib, so we apply the admin base colour to the mid-range variables
  // and keep the rest of the palette untouched. The key interactive colours
  // (600, 700, 800) get direct mapping from the hex value.
  const [r, g, b] = mid.split(" ").map(Number);

  const shade = (factor: number) => {
    const adjust = (v: number) =>
      Math.min(255, Math.max(0, Math.round(v * factor)));
    return `${adjust(r)} ${adjust(g)} ${adjust(b)}`;
  };

  return [
    `--${prefix}-50: ${shade(3.2)};`,
    `--${prefix}-100: ${shade(2.6)};`,
    `--${prefix}-200: ${shade(2.0)};`,
    `--${prefix}-300: ${shade(1.6)};`,
    `--${prefix}-400: ${shade(1.2)};`,
    `--${prefix}-500: ${mid};`,
    `--${prefix}-600: ${shade(0.85)};`,
    `--${prefix}-700: ${shade(0.7)};`,
    `--${prefix}-800: ${shade(0.55)};`,
    `--${prefix}-900: ${shade(0.4)};`,
  ].join("\n    ");
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SiteInjector() {
  const { settings } = useSettings();

  // ── 1. <title> ────────────────────────────────────────────────────────────
  useEffect(() => {
    const title = settings.metaTitle || settings.siteName;
    if (title) document.title = title;
  }, [settings.metaTitle, settings.siteName]);

  // ── 2. Meta tags ──────────────────────────────────────────────────────────
  useEffect(() => {
    const upsertMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector(
        `meta[${attr}="${name}"]`,
      ) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    if (settings.metaDescription || settings.siteDescription) {
      const desc = (settings.metaDescription || settings.siteDescription)!;
      upsertMeta("description", desc);
      upsertMeta("og:description", desc, true);
    }
    if (settings.siteKeywords) {
      upsertMeta("keywords", settings.siteKeywords);
    }
    if (settings.metaTitle || settings.siteName) {
      const t = (settings.metaTitle || settings.siteName)!;
      upsertMeta("og:title", t, true);
    }
    if (settings.siteName) {
      upsertMeta("og:site_name", settings.siteName, true);
    }
    if (settings.metaImage) {
      upsertMeta("og:image", settings.metaImage, true);
      upsertMeta("twitter:image", settings.metaImage);
    }
  }, [
    settings.metaDescription,
    settings.siteDescription,
    settings.siteKeywords,
    settings.metaTitle,
    settings.siteName,
    settings.metaImage,
  ]);

  // ── 3. Favicon ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!settings.favicon) return;
    document
      .querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
      .forEach((el) => el.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = settings.favicon;
    link.type = /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(settings.favicon)
      ? "image/png"
      : "image/x-icon";
    document.head.appendChild(link);
  }, [settings.favicon]);

  // ── 4. CSS brand colour variables ─────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    if (!root) return;

    if (settings.primaryColor) {
      const mid = hexToRgbVars(settings.primaryColor);
      if (mid) {
        const [r, g, b] = mid.split(" ").map(Number);
        const s = (f: number) =>
          `${Math.min(255, Math.round(r * f))} ${Math.min(255, Math.round(g * f))} ${Math.min(255, Math.round(b * f))}`;
        root.style.setProperty("--brand-50", s(3.2));
        root.style.setProperty("--brand-100", s(2.6));
        root.style.setProperty("--brand-200", s(2.0));
        root.style.setProperty("--brand-300", s(1.6));
        root.style.setProperty("--brand-400", s(1.2));
        root.style.setProperty("--brand-500", mid);
        root.style.setProperty("--brand-600", s(0.85));
        root.style.setProperty("--brand-700", s(0.7));
        root.style.setProperty("--brand-800", s(0.55));
        root.style.setProperty("--brand-900", s(0.4));
      }
    }

    if (settings.secondaryColor) {
      const mid = hexToRgbVars(settings.secondaryColor);
      if (mid) {
        const [r, g, b] = mid.split(" ").map(Number);
        const s = (f: number) =>
          `${Math.min(255, Math.round(r * f))} ${Math.min(255, Math.round(g * f))} ${Math.min(255, Math.round(b * f))}`;
        root.style.setProperty("--gold-50", s(3.2));
        root.style.setProperty("--gold-100", s(2.6));
        root.style.setProperty("--gold-200", s(2.0));
        root.style.setProperty("--gold-300", s(1.6));
        root.style.setProperty("--gold-400", s(1.2));
        root.style.setProperty("--gold-500", mid);
        root.style.setProperty("--gold-600", s(0.85));
        root.style.setProperty("--gold-700", s(0.7));
      }
    }
  }, [settings.primaryColor, settings.secondaryColor]);

  // ── 5. Google Analytics 4 ─────────────────────────────────────────────────
  useEffect(() => {
    const gid = settings.googleAnalyticsId;
    if (!gid || typeof window === "undefined") return;
    if (document.getElementById("ga4-script")) return; // already injected

    const s1 = document.createElement("script");
    s1.id = "ga4-script";
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${gid}`;
    document.head.appendChild(s1);

    const s2 = document.createElement("script");
    s2.id = "ga4-init";
    s2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gid}');
    `;
    document.head.appendChild(s2);
  }, [settings.googleAnalyticsId]);

  // ── 6. Meta / Facebook Pixel ──────────────────────────────────────────────
  useEffect(() => {
    const pid = settings.facebookPixelId;
    if (!pid || typeof window === "undefined") return;
    if (document.getElementById("fb-pixel-script")) return; // already injected

    const s = document.createElement("script");
    s.id = "fb-pixel-script";
    s.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pid}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(s);

    // noscript fallback
    const ns = document.createElement("noscript");
    ns.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pid}&ev=PageView&noscript=1"/>`;
    document.body.insertBefore(ns, document.body.firstChild);
  }, [settings.facebookPixelId]);

  return null;
}
