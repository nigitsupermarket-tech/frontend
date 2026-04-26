"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Category } from "@/types";
import { apiGet } from "@/lib/api";
import { Skeleton } from "@/components/shared/loading-spinner";
import Image from "next/image";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiGet<any>("/categories")
      .then((res) =>
        setCategories(res.data.categories.filter((c: Category) => !c.parentId)),
      )
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="container py-10">
      <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">
        Shop by Category
      </h1>
      <p className="text-gray-500 mb-8">
        Browse our curated collection of business essentials.
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-elevated hover:border-brand-100 transition-all"
            >
              <div className="aspect-square bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center overflow-hidden">
                {cat.image ? (
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    width={300}
                    height={300}
                  />
                ) : (
                  <span className="text-5xl text-brand-200 font-bold">
                    {cat.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
                  {cat.name}
                </h2>
                {cat._count?.products !== undefined && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {cat._count.products} products
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
