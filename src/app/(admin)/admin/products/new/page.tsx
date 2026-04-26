//frontend/src/app/(admin)/admin/products/new/page.tsx
"use client";

import { useRouter } from "next/navigation";
import ProductForm from "@/components/admin/product-form";

export default function NewProductPage() {
  const router = useRouter();
  return <ProductForm onSave={() => router.push("/admin/products")} />;
}
