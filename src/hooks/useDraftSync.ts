"use client";
// frontend/src/hooks/useDraftSync.ts
//
// "Continue where you left off": autosaves a page's in-progress state to
// the backend (see /api/v1/drafts) under a stable key, debounced, and
// restores it once on mount. Pair this with the admin layout's
// "last-page" tracking (see components/admin/last-page-tracker.tsx) so a
// user who's logged out mid-task — a half-filled product form, an
// unfinished POS cart — gets routed back to the exact page they were on
// AND has that page's state rebuilt automatically, instead of starting
// over.
//
// Usage:
//   const { restored, clearDraft } = useDraftSync({
//     key: `product-edit:${productId}`,
//     state: formState,
//     onRestore: (payload) => setFormState(payload),
//     enabled: !isSubmitting, // pause autosave while submitting, etc.
//   });
//   // ...on successful submit:
//   clearDraft();

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { apiGet, apiPut, apiDelete } from "@/lib/api";

interface UseDraftSyncOptions<T> {
  /** Stable, unique key for this draft — e.g. "product-edit:507f1f...". */
  key: string;
  /** The current in-progress state to keep saved. */
  state: T;
  /** Called once, on mount, if a saved draft is found — apply it to your state. */
  onRestore: (payload: T) => void;
  /**
   * Skip saving while true (e.g. mid-submit, or before the form has
   * loaded its initial data — you don't want to save default/empty state
   * over a real draft before the real data has even loaded).
   */
  enabled?: boolean;
  /** Debounce interval for autosave, ms. Default 1500. */
  debounceMs?: number;
  /**
   * A value to compare against a freshly-loaded state to decide whether
   * restoring is worthwhile — e.g. skip restoring an empty draft. Return
   * false from this to ignore a restorable draft (rare — most callers
   * don't need it).
   */
  shouldRestore?: (payload: T) => boolean;
  /**
   * Gate for WHEN the restore check runs — defaults to true (check
   * immediately on mount). Pass `!isLoadingInitialData` for pages that
   * fetch their own initial state (e.g. an edit form loading the current
   * record from the server): otherwise the restore could fire first, and
   * then the server fetch's own setState would immediately clobber it.
   * The check runs once, the first time this flips true.
   */
  restoreWhen?: boolean;
}

export function useDraftSync<T>({
  key,
  state,
  onRestore,
  enabled = true,
  debounceMs = 1500,
  shouldRestore,
  restoreWhen = true,
}: UseDraftSyncOptions<T>) {
  const pathname = usePathname();
  const [restored, setRestored] = useState(false);
  const [checkedForDraft, setCheckedForDraft] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredOnceRef = useRef(false);

  // ── Restore once, the first time restoreWhen is true ─────────────────
  useEffect(() => {
    if (!restoreWhen || restoredOnceRef.current) return;
    restoredOnceRef.current = true;
    apiGet<any>(`/drafts/${encodeURIComponent(key)}`)
      .then((res) => {
        const draft = res.data?.draft;
        if (draft?.payload !== undefined) {
          if (!shouldRestore || shouldRestore(draft.payload)) {
            onRestore(draft.payload);
            setRestored(true);
          }
        }
      })
      .catch(() => {
        // No draft, or not logged in yet — either way, nothing to restore.
      })
      .finally(() => setCheckedForDraft(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, restoreWhen]);

  // ── Debounced autosave whenever `state` changes ──────────────────────
  useEffect(() => {
    if (!enabled || !checkedForDraft) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      apiPut(`/drafts/${encodeURIComponent(key)}`, {
        path: pathname,
        payload: state,
      }).catch(() => {
        // Best-effort — a failed autosave shouldn't interrupt the user.
      });
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, state, enabled, checkedForDraft, pathname, debounceMs]);

  // ── Clear the draft once the work is actually saved/submitted ───────
  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    apiDelete(`/drafts/${encodeURIComponent(key)}`).catch(() => {});
  }, [key]);

  return { restored, clearDraft };
}
