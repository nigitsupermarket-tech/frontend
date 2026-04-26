"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/customer/product-card";
import {
  ProductCardSkeleton,
  EmptyState,
} from "@/components/shared/loading-spinner";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";

export function ShopByCategory() {
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  // ── DEBUG ──────────────────────────────────────────────────────────────────
  // "random" sort uses $runCommandRaw on the backend — it had an ObjectId bug
  // (fixed in product.controller.ts). Changed to "newest" to avoid the 500
  // crash that was making the homepage hang. Switch back to "random" once the
  // backend fix is confirmed deployed.
  // ──────────────────────────────────────────────────────────────────────────
  const {
    products,
    isLoading: productsLoading,
    error: productsError,
  } = useProducts({
    categoryId: selectedCategoryId || undefined,
    limit: 8,
    sort: "newest", // was "random" — caused 500 from malformed ObjectId extraction
  });

  // ── Console diagnostics — remove once confirmed working ───────────────────
  console.log(
    `[ShopByCategory] categories: ${categories.length}, loading: ${categoriesLoading}`,
  );
  console.log(
    `[ShopByCategory] products: ${products.length}, loading: ${productsLoading}, error: ${productsError}`,
  );
  if (productsError) {
    console.error("[ShopByCategory] ❌ products fetch error:", productsError);
  }

  // Find active category for display purposes
  const activeCategory = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId)
    : null;

  const scrollCategories = (direction: "left" | "right") => {
    const container = document.getElementById("category-scroll");
    if (container) {
      const scrollAmount = 200;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="container py-16">
      <div className="mb-8">
        <h2 className="font-display text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          Shop by Category
        </h2>
        <p className="text-gray-600">
          Browse products by your preferred category
        </p>
      </div>

      {/* Category Pills - Horizontal Scroll */}
      <div className="relative mb-8">
        <button
          onClick={() => scrollCategories("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>

        <div
          id="category-scroll"
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-10"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {categoriesLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-32 h-10 bg-gray-100 rounded-full animate-pulse"
              />
            ))
          ) : (
            <>
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`shrink-0 px-6 py-2.5 rounded-full font-medium text-sm transition-all ${
                  !selectedCategoryId
                    ? "bg-brand-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All Products
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`shrink-0 px-6 py-2.5 rounded-full font-medium text-sm transition-all whitespace-nowrap ${
                    selectedCategoryId === category.id
                      ? "bg-brand-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </>
          )}
        </div>

        <button
          onClick={() => scrollCategories("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Products Grid */}
      {productsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          description={`No products available${activeCategory ? ` in ${activeCategory.name}` : ""}`}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* View All Button */}
          <div className="text-center">
            <Link
              href={
                selectedCategoryId
                  ? `/products?categoryId=${selectedCategoryId}`
                  : "/products"
              }
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors"
            >
              View All {activeCategory ? `${activeCategory.name} ` : ""}Products
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
