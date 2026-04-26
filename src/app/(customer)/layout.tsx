// app/(customer)/layout.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { PageLoader } from "@/components/shared/loading-spinner";
import { Header } from "@/components/customer/header";
import { Footer } from "@/components/customer/footer";
import { CartDrawer } from "@/components/customer/cart/cart-drawer";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const verified = useRef(false);

  useEffect(() => {
    if (verified.current) return;
    verified.current = true;

    let isMounted = true;

    const verifyAccess = async () => {
      const before = useAuthStore.getState();

      // ── Fast-path: already authenticated from persisted store ──
      // If Zustand persist rehydrated a valid session (user + token in
      // localStorage), show content immediately. Then silently refresh
      // in the background to get fresh tokens & user data.
      const lsToken = localStorage.getItem("accessToken");
      if (before.isAuthenticated && before.user && lsToken) {
        setIsReady(true);
        // Background silent refresh — don't await, don't block the UI
        useAuthStore
          .getState()
          .silentRefresh()
          .catch(() => {});
        return;
      }

      // ── Slow-path: no persisted session → try silent refresh via cookie ──
      // The 30-day httpOnly refresh cookie may still be valid even if
      // localStorage was cleared (e.g. incognito tab ended, or tokens expired).
      try {
        const restored = await useAuthStore.getState().silentRefresh();

        if (!isMounted) return;

        if (restored) {
          setIsReady(true);
          syncWishlist();
        } else {
          router.replace("/login?redirect=/account");
        }
      } catch {
        if (isMounted) {
          router.replace("/login?redirect=/account");
        }
      }
    };

    verifyAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (!isReady) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
    </div>
  );
}

// Trigger wishlist fetch once after session restore without re-rendering layout
function syncWishlist() {
  try {
    // Dynamic import to avoid circular deps at module init time
    import("@/store/wishlistStore").then(({ useWishlistStore }) => {
      useWishlistStore.getState().fetchWishlist();
    });
  } catch {}
}
