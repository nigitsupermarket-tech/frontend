// app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/shared/toaster";
import { Providers } from "@/components/shared/providers";
import { SiteInjector } from "@/components/shared/site-injector";

export const metadata: Metadata = {
  title: {
    default: "NigitTriple Industry",
    template: "%s | NigitTriple Industry",
  },
  description:
    "NigitTriple Industry — Your premium grocery supermarket in Port Harcourt. Shop fresh food, beverages, household essentials and more with fast delivery across Rivers State.",
  keywords: [
    "grocery",
    "supermarket",
    "Port Harcourt",
    "Nigeria",
    "food",
    "beverages",
    "NigitTriple",
  ],
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: "NigitTriple Industry",
  },
  twitter: {
    card: "summary_large_image",
  },
};

// ── Layout ────────────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        {/* Loaded by the browser at runtime (not next/font/google) so a
            Google Fonts hiccup can never break the production build. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap"
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <SiteInjector />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
