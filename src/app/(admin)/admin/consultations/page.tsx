// admin/consultations/page.tsx
// Consultations removed
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConsultationsPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/dashboard"); }, [router]);
  return null;
}
