// src/hooks/useSettings.ts
"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";
import { SiteSettings } from "@/types";

// ─── Module-level singleton cache ─────────────────────────────────────────────
// One fetch for the entire app session, shared across all hook instances.
// Prevents parallel /api/v1/settings calls on every page navigation.
//
// KEY FIX: In Next.js dev/Turbopack, module-level variables CAN be reset by
// HMR between navigations. The cache is now also written to sessionStorage so
// it survives client-side navigations even if the module re-initialises.

const SESSION_KEY = "nt_settings_cache";
const TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: Partial<SiteSettings>;
  at: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readSession(): CacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    return entry;
  } catch {
    return null;
  }
}

function writeSession(data: Partial<SiteSettings>) {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry = { data, at: Date.now() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage quota — silently ignore
  }
}

function isFresh(entry: CacheEntry | null): boolean {
  return entry !== null && Date.now() - entry.at < TTL;
}

function getCached(): Partial<SiteSettings> | null {
  const entry = readSession();
  return isFresh(entry) ? entry!.data : null;
}

// Single in-flight promise — all concurrent callers await the same request
let _inflight: Promise<Partial<SiteSettings>> | null = null;

async function fetchSettings(): Promise<Partial<SiteSettings>> {
  const cached = getCached();
  if (cached) return cached;

  // Deduplicate concurrent calls
  if (_inflight) return _inflight;

  _inflight = apiGet<any>("/settings")
    .then((res) => {
      const data: Partial<SiteSettings> = res.data?.settings ?? {};
      writeSession(data);
      return data;
    })
    .catch(() => {
      // Return whatever is in session (even stale) rather than crashing
      const entry = readSession();
      return entry?.data ?? {};
    })
    .finally(() => {
      _inflight = null;
    });

  return _inflight;
}

/** Call this after admin saves settings so the next read re-fetches */
export function invalidateSettingsCache() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SESSION_KEY);
  }
  _inflight = null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSettings() {
  // Initialise synchronously from cache so pages render immediately
  // without waiting for a network round-trip on subsequent navigations.
  const initial = getCached() ?? {};
  const [settings, setSettings] = useState<Partial<SiteSettings>>(initial);
  const [isLoading, setIsLoading] = useState(Object.keys(initial).length === 0);

  useEffect(() => {
    const cached = getCached();
    if (cached) {
      setSettings(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchSettings()
      .then((s) => setSettings(s))
      .finally(() => setIsLoading(false));
  }, []);

  return { settings, isLoading };
}
