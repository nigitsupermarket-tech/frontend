'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Category } from '@/types';
import { apiGet } from '@/lib/api';
import { ProductCard } from '@/components/customer/product-card';
import { ProductCardSkeleton, EmptyState } from '@/components/shared/loading-spinner';
import { useProducts } from '@/hooks/useProducts';

export default function CategoryProductsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);

  useEffect(() => {
    apiGet<any>(`/categories/${slug}`).then((res) => setCategory(res.data.category)).catch(() => {});
  }, [slug]);

  const { products, pagination, isLoading } = useProducts({ categoryId: category?.id, limit: 20 });

  return (
    <div className="container py-10">
      <Link href="/categories" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> All Categories
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900">{category?.name || 'Category'}</h1>
        {category?.description && <p className="mt-2 text-gray-500">{category.description}</p>}
        {pagination && <p className="mt-1 text-sm text-gray-400">{pagination.total} products</p>}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState title="No products in this category" description="Check back soon or browse other categories." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
