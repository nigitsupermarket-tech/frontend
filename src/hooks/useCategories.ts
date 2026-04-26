//frontend/src/hooks/useCategories.ts
"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";
import { Category } from "@/types";

interface CategoriesResponse {
  success: boolean;
  data: {
    categories: Category[];
  };
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const res = await apiGet<CategoriesResponse>("/categories");
        setCategories(res.data.categories);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to load categories");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, isLoading, error };
}
