// frontend/src/hooks/usePriceVisibility.ts
"use client";

import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";

/**
 * Central rule for whether a guest should see prices anywhere on the
 * customer-facing site (product cards, single product page, cart, wishlist,
 * header, etc). Controlled by the admin's "Hide Prices" toggle in Settings
 * → General (SiteSetting.hidePricesUntilLogin), which defaults to ON.
 *
 * - Signed-in customers ALWAYS see prices, regardless of the setting.
 * - Guests see prices only when the admin has explicitly turned the
 *   toggle off.
 *
 * While settings are still loading we default to hiding (the safer
 * default), so prices don't briefly flash for guests before the real
 * setting value arrives.
 */
export function usePriceVisibility() {
  const { isAuthenticated } = useAuth();
  const { settings, isLoading } = useSettings();

  const hideForGuests = settings.hidePricesUntilLogin ?? true;
  const pricesHidden = !isAuthenticated && hideForGuests;

  return {
    /** True when prices should be hidden from the current visitor. */
    pricesHidden,
    /** Still resolving the setting — callers can use this to avoid flicker. */
    isLoading,
    isAuthenticated,
  };
}
