"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/customer/product-card";
import { ProductCardSkeleton } from "@/components/shared/loading-spinner";
import { useNewArrivals } from "@/hooks/useProducts";

const GRID =
  "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4";

export function NewArrivals() {
  const { products, isLoading } = useNewArrivals(8);

  // Same rule as Featured Products: hide the whole section (title + "View
  // all") once we know there's nothing to show, instead of leaving an
  // empty-looking header on the homepage.
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="bg-gray-50 py-16">
      <div className="container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-semibold text-gold-500 uppercase tracking-wider mb-1">
              Just landed
            </p>
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-gray-900">
              New Arrivals
            </h2>
          </div>
          <Link
            href="/products?isNewArrival=true"
            className="text-sm font-medium text-brand-600 hover:text-brand-800 flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className={GRID}>
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className={GRID}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
