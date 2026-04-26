// app/layout.tsx

import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/shared/toaster";
import { Providers } from "@/components/shared/providers";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

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
      </head>
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
