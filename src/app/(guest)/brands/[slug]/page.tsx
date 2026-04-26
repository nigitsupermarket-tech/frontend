"use client";
// frontend/src/app/(guest)/brands/[slug]/page.tsx
// SEO-friendly URL: /brands/peroni  (uses brand slug not ID)

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/types";
import { apiGet } from "@/lib/api";
import { ProductCard } from "@/components/customer/product-card";
import { ProductCardSkeleton, EmptyState } from "@/components/shared/loading-spinner";
import { useProducts } from "@/hooks/useProducts";

export default function BrandProductsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [brand, setBrand] = useState<Brand | null>(null);

  useEffect(() => {
    // Backend already accepts slug OR id in GET /brands/:id
    apiGet<any>(`/brands/${slug}`)
      .then((res) => setBrand(res.data.brand))
      .catch(() => {});
  }, [slug]);

  const { products, pagination, isLoading } = useProducts({
    brandId: brand?.id,
    limit: 20,
  });

  return (
    <div className="container py-10">
      <Link href="/brands" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> All Brands
      </Link>

      <div className="flex items-center gap-4 mb-8">
        {brand?.logo && (
          <div className="w-16 h-16 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0 bg-white">
            <Image src={brand.logo} alt={brand.name} width={64} height={64} className="w-full h-full object-contain p-1" />
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900">{brand?.name || "Brand"}</h1>
          {brand?.description && <p className="mt-1 text-gray-500 text-sm">{brand.description}</p>}
          {pagination && <p className="mt-1 text-sm text-gray-400">{pagination.total} products</p>}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState title="No products for this brand" description="Check back soon or browse other brands." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
