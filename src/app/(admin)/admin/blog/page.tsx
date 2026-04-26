//frontend/src/app/(admin)/admin/blog/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, Eye, Tag } from "lucide-react";
import { BlogPost } from "@/types";
import { apiGet, apiDelete, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatDate } from "@/lib/utils";
import {
  TableRowSkeleton,
  EmptyState,
} from "@/components/shared/loading-spinner";
import Image from "next/image";

const statusColors: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  DRAFT: "bg-gray-100 text-gray-600",
  ARCHIVED: "bg-red-100 text-red-700",
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const toast = useToast();

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const params: any = { limit: 50 };
      if (filter) params.status = filter;
      const res = await apiGet<any>("/blog/posts", params);
      setPosts(res.data.posts);
    } catch {
      toast("Failed to load", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await apiDelete(`/blog/posts/${id}`);
      toast("Deleted", "success");
      fetchPosts();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Blog Posts</h1>
        <div className="flex items-center gap-2">
          {/* ✅ FIX 4: Link to the new blog categories management page */}
          <Link
            href="/admin/blog/categories"
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:border-brand-400 hover:text-brand-600 transition-colors"
          >
            <Tag className="w-4 h-4" /> Categories
          </Link>
          <Link
            href="/admin/blog/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Post
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          ["", "All"],
          ["PUBLISHED", "Published"],
          ["DRAFT", "Drafts"],
          ["ARCHIVED", "Archived"],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v as string)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === v ? "bg-brand-600 text-white" : "border border-gray-200 text-gray-600 hover:border-brand-300"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              {[
                "Title",
                "Category",
                "Author",
                "Status",
                "Views",
                "Date",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={7} />
              ))
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    title="No blog posts yet"
                    action={
                      <Link
                        href="/admin/blog/new"
                        className="px-4 py-2 bg-brand-600 text-white text-sm rounded-xl"
                      >
                        Create first post
                      </Link>
                    }
                  />
                </td>
              </tr>
            ) : (
              posts.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.featuredImage && (
                        <Image
                          src={p.featuredImage}
                          alt={p.title}
                          className="w-8 h-8 rounded-lg object-cover shrink-0"
                          width={32}
                          height={32}
                        />
                      )}
                      <span className="font-medium text-gray-900 line-clamp-1 max-w-xs">
                        {p.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {p.category?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {p.author?.name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status]}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {p.viewCount}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {p.publishedAt
                      ? formatDate(p.publishedAt)
                      : formatDate(p.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/blog/${p.slug}`}
                        target="_blank"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/admin/blog/${p.id}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, p.title)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
