import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeaturedProductsGrid } from "./product-grids";

export function FeaturedProducts() {
  return (
    <section className="container py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-sm font-semibold text-gold-500 uppercase tracking-wider mb-1">
            Curated for you
          </p>
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-gray-900">
            Featured Products
          </h2>
        </div>
        <Link
          href="/products?isFeatured=true"
          className="text-sm font-medium text-brand-600 hover:text-brand-800 flex items-center gap-1"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <FeaturedProductsGrid />
    </section>
  );
}
