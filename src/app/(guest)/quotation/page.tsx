// (guest)/quotation/page.tsx — redirects to products (no wholesale quotations)
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function QuotationPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/contact"); }, [router]);
  return null;
}
