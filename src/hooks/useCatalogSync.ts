"use client";
// frontend/src/hooks/useCatalogSync.ts
//
// Drives the POS terminal's offline product cache (see
// lib/posOfflineCache.ts): syncs once on mount, again on an interval,
// and again the instant the browser regains connectivity — so the cache
// is never far behind, but a scan/search never has to wait on any of
// that to resolve.

import { useEffect, useRef, useState, useCallback } from "react";
import {
  syncCatalog,
  getLastSyncedAt,
  getCachedProductCount,
} from "@/lib/posOfflineCache";

const BACKGROUND_SYNC_INTERVAL_MS = 3 * 60 * 1000; // 3 min

interface CatalogSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  productCount: number;
  /** True once the first sync attempt (success or failure) has resolved. */
  ready: boolean;
}

export function useCatalogSync() {
  const [state, setState] = useState<CatalogSyncState>({
    isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
    isSyncing: false,
    lastSyncedAt: null,
    productCount: 0,
    ready: false,
  });
  const mountedRef = useRef(true);

  const refreshStats = useCallback(async () => {
    const [lastSyncedAt, productCount] = await Promise.all([
      getLastSyncedAt(),
      getCachedProductCount(),
    ]);
    if (!mountedRef.current) return;
    setState((s) => ({ ...s, lastSyncedAt, productCount }));
  }, []);

  const runSync = useCallback(
    async (opts?: { force?: boolean }) => {
      setState((s) => ({ ...s, isSyncing: true }));
      const result = await syncCatalog(opts);
      if (mountedRef.current) {
        setState((s) => ({ ...s, isSyncing: false, ready: true }));
        await refreshStats();
      }
      return result;
    },
    [refreshStats],
  );

  useEffect(() => {
    mountedRef.current = true;

    // If the cache is already populated from a previous session, show
    // that immediately (so "Scanner ready" doesn't sit on 0 products
    // while the first sync is still in flight), then kick off a normal
    // delta sync in the background.
    refreshStats().then(() => runSync());

    const interval = setInterval(() => runSync(), BACKGROUND_SYNC_INTERVAL_MS);

    const handleOnline = () => {
      setState((s) => ({ ...s, isOnline: true }));
      runSync();
    };
    const handleOffline = () => setState((s) => ({ ...s, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    /** Force a full resync (e.g. a "Refresh catalog" button in settings). */
    syncNow: (opts?: { force?: boolean }) => runSync(opts),
  };
}
