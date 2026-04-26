// admin/quotations/page.tsx
// Quotations removed — redirect to promotions which serves the same discovery purpose
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function QuotationsPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/promotions"); }, [router]);
  return null;
}
