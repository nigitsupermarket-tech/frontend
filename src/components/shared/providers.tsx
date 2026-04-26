// components/shared/providers.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useSettings } from "@/hooks/useSettings";

const PROTECTED_ROUTES = ["/account", "/orders"];

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
}

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

  // Pre-warm settings cache
  useSettings();

  // ── FIX: Get store functions via getState() so they are never part of the
  // dependency array. Zustand store *methods* are stable but subscribing to
  // them via the hook recreates the reference every time any slice of state
  // changes, causing useEffect to re-fire → infinite checkAuth/fetchCart loop.
  // Using a ref + getState() breaks the cycle entirely.
  const authInitialized = useRef(false);
  const cartInitialized = useRef(false);

  // Run ONCE on mount — never again regardless of state changes
  useEffect(() => {
    if (cartInitialized.current) return;
    cartInitialized.current = true;
    useCartStore.getState().fetchCart();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;

    const init = async () => {
      try {
        await useAuthStore.getState().checkAuth();
      } catch {
        // Guest — fine
      } finally {
        setIsAuthInitialized(true);
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Block only truly protected routes until auth resolves
  if (isProtectedRoute(pathname) && !isAuthInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  return <>{children}</>;
}
