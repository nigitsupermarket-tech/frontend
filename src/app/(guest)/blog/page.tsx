//frontend/src/app/(guest)/blog/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { BlogPost, BlogCategory } from "@/types";
import { apiGet } from "@/lib/api";
import { formatDate, truncate } from "@/lib/utils";
import { ProductCardSkeleton } from "@/components/shared/loading-spinner";
import Image from "next/image";

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 9, status: "PUBLISHED" };
      if (search) params.search = search;
      if (categoryId) params.categoryId = categoryId;
      const [postsRes, catsRes] = await Promise.all([
        apiGet<any>("/blog/posts", params),
        apiGet<any>("/blog/categories"),
      ]);
      setPosts(postsRes.data.posts);
      setTotal(postsRes.data.pagination.total);
      setCategories(catsRes.data.categories);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page, categoryId]);

  return (
    <div className="container py-10">
      <div className="max-w-2xl mx-auto text-center mb-10">
        <h1 className="font-display text-3xl lg:text-4xl font-bold text-gray-900">
          Blog & Insights
        </h1>
        <p className="mt-3 text-gray-500">
          Business tips, product guides, and inspiration for the modern business
          woman.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8 max-w-2xl mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchPosts();
          }}
          className="flex-1 relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
          />
        </form>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-80 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No articles found.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-elevated hover:border-brand-100 transition-all"
            >
              <div className="aspect-video bg-gray-100 overflow-hidden">
                {post.featuredImage ? (
                  <Image
                    src={post.featuredImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    width={600}
                    height={400}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center">
                    <span className="text-brand-300 text-4xl">✦</span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  {post.category && (
                    <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                      {post.category.name}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {post.publishedAt ? formatDate(post.publishedAt) : ""}
                  </span>
                </div>
                <h2 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors line-clamp-2">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                    {post.excerpt}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {Math.ceil(total / 9) > 1 && (
        <div className="mt-10 flex justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-40 hover:border-brand-300 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">Page {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / 9)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-40 hover:border-brand-300 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
