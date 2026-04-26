// app/(admin)/admin/layout.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import { SidebarProvider } from "@/components/admin/sidebar-context";
import { PageLoader } from "@/components/shared/loading-spinner";

const ALLOWED_ROLES = ["ADMIN", "STAFF", "SALES"];

export default function AdminLayout({
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
      try {
        await useAuthStore.getState().checkAuth();
        if (!isMounted) return;
        const user = useAuthStore.getState().user;
        const auth = useAuthStore.getState().isAuthenticated;
        if (!auth) {
          router.replace("/login?redirect=/admin");
          return;
        }
        if (!user?.role || !ALLOWED_ROLES.includes(user.role)) {
          router.replace("/?error=unauthorized");
          return;
        }
        setIsReady(true);
      } catch {
        if (isMounted) router.replace("/login?redirect=/admin");
      }
    };
    verifyAccess();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // if (!isReady) return <PageLoader />;
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
