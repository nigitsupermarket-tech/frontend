"use client";

// frontend/src/app/_components/home/promotions-of-the-week.tsx
// Bell Italia-style "Promotions of the Week!!!" section

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Product } from "@/types";
import { ProductCard } from "@/components/customer/product-card";
import { Loader2, Tag } from "lucide-react";
import Link from "next/link";

export function PromotionsOfTheWeek() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<any>("/products?isOnPromotion=true&limit=6&status=ACTIVE")
      .then((res) => setProducts(res.data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-10 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header — matches Bell Italia style */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 uppercase tracking-widest">
            Promotions of the Week!!!
          </h2>
          <div className="mt-2 mx-auto w-16 h-1 bg-green-600 rounded-full" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="text-center mt-8">
            <Link
              href="/products?isOnPromotion=true"
              className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-green-600 text-green-700 font-semibold text-sm rounded hover:bg-green-600 hover:text-white transition-colors uppercase tracking-wide"
            >
              <Tag className="w-4 h-4" />
              View All Promotions
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
