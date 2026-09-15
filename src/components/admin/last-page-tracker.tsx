"use client";
// frontend/src/components/admin/last-page-tracker.tsx
//
// Silently records the current admin/staff dashboard path as the user's
// "last-page" draft (see useDraftSync / draft.controller.ts) every time it
// changes. On next login, useAuth checks this draft and routes the user
// straight back here instead of the default dashboard landing — the
// first half of "continue where you left off": this gets them to the
// right PAGE, while that page's own useDraftSync() (product form, POS
// cart, etc.) restores what they were doing on it.
//
// Mount this once, near the root of the admin layout — it renders nothing.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { apiPut } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

// Pages that aren't worth "resuming" — sending someone back to a modal-ish
// or transient action page on login would be confusing rather than
// helpful. Add more prefixes here as needed.
const EXCLUDED_PREFIXES = ["/admin/products/delete-requests"];

export function LastPageTracker() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !pathname) return;
    if (lastSaved.current === pathname) return;
    if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return;

    lastSaved.current = pathname;
    // Fire-and-forget, slightly debounced by the ref check above (only
    // fires once per distinct path, not on every render).
    apiPut("/drafts/last-page", { path: pathname, payload: { path: pathname } }).catch(
      () => {},
    );
  }, [pathname, isAuthenticated]);

  return null;
}
