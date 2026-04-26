'use client';

import { useParams, useRouter } from 'next/navigation';
import ProductForm from '@/components/admin/product-form';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  return <ProductForm productId={id} onSave={() => router.push('/admin/products')} />;
}
