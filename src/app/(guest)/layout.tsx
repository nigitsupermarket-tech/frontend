// app/(guest)/layout.tsx
"use client";

import { Header } from "@/components/customer/header";
import { Footer } from "@/components/customer/footer";
import { CartDrawer } from "@/components/customer/cart/cart-drawer";
import WhatsAppChat from "@/components/customer/whatsapp-chat";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppChat />
    </div>
  );
}
