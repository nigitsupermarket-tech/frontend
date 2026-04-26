'use client';

import { ProductCard } from '@/components/customer/product-card';
import { ProductCardSkeleton } from '@/components/shared/loading-spinner';
import { useFeaturedProducts, useNewArrivals } from '@/hooks/useProducts';

const GRID = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4";

export function FeaturedProductsGrid() {
  const { products, isLoading } = useFeaturedProducts(8);

  if (isLoading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={GRID}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export function NewArrivalsGrid() {
  const { products, isLoading } = useNewArrivals(8);

  if (isLoading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={GRID}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
