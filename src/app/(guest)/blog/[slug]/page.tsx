//frontend/src/app/(guest)/blog/[slug]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Eye, Tag } from "lucide-react";
import { BlogPost } from "@/types";
import { apiGet } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { ErrorState } from "@/components/shared/loading-spinner";
import Image from "next/image";

// ✅ FIX: Replaced `if (isLoading) return <PageLoader />` with an inline
// skeleton. PageLoader replaces the *entire* page tree (including the layout
// Header/Footer) with a spinner, which looks broken and can confuse the router
// into thinking a navigation failed. An inline skeleton keeps the layout
// intact and gives better UX.

function BlogPostSkeleton() {
  return (
    <div className="container py-10 max-w-3xl animate-pulse">
      <div className="h-4 w-24 bg-gray-200 rounded mb-8" />
      <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
      <div className="h-10 bg-gray-200 rounded mb-4" />
      <div className="h-10 w-3/4 bg-gray-200 rounded mb-6" />
      <div className="flex gap-4 mb-6">
        <div className="h-4 w-28 bg-gray-200 rounded" />
        <div className="h-4 w-20 bg-gray-200 rounded" />
      </div>
      <div className="aspect-video bg-gray-200 rounded-2xl mb-8" />
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`h-4 bg-gray-200 rounded ${i % 3 === 2 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    setIsLoading(true);
    setError(null);

    const decodedSlug = decodeURIComponent(slug as string);

    apiGet<any>(`/blog/posts/${decodedSlug}`)
      .then((res) => {
        setPost(res.data.post);
        setRelated(res.data.related || []);
      })
      .catch((err) => {
        console.error("Failed to load blog post:", err);
        setError("Post not found");
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  // ✅ Inline skeleton — does NOT replace the layout shell
  if (isLoading) return <BlogPostSkeleton />;

  if (error || !post)
    return (
      <div className="container py-12">
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">{error || "Post not found"}</p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-brand-600 hover:underline text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
        </div>
      </div>
    );

  return (
    <div className="container py-10 max-w-3xl">
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Blog
      </Link>

      {post.category && (
        <Link
          href={`/blog?categoryId=${post.category.id}`}
          className="inline-block px-3 py-1 bg-brand-50 text-brand-600 text-sm font-medium rounded-full hover:bg-brand-100 transition-colors mb-4"
        >
          {post.category.name}
        </Link>
      )}

      <h1 className="font-display text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
        {post.title}
      </h1>

      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-400">
        {post.publishedAt && (
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {formatDate(post.publishedAt)}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Eye className="w-4 h-4" />
          {post.viewCount} views
        </span>
        {post.tags && post.tags.length > 0 && (
          <span className="flex items-center gap-1.5 flex-wrap">
            <Tag className="w-4 h-4 shrink-0" />
            {post.tags.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {t}
              </span>
            ))}
          </span>
        )}
      </div>

      {post.featuredImage && (
        <div className="mt-6 rounded-2xl overflow-hidden aspect-video">
          <Image
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-full object-cover"
            width={1200}
            height={675}
          />
        </div>
      )}

      {post.excerpt && (
        <p className="mt-6 text-lg text-gray-600 leading-relaxed border-l-4 border-brand-300 pl-4">
          {post.excerpt}
        </p>
      )}

      {/* Blog content rendered from HTML */}
      <div
        className="mt-8 prose prose-sm lg:prose-base max-w-none text-gray-700
          prose-headings:font-display prose-headings:text-gray-900
          prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-3
          prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-2
          prose-p:leading-relaxed prose-p:my-3
          prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-gray-900
          prose-ul:list-disc prose-ul:pl-5 prose-li:my-1
          prose-ol:list-decimal prose-ol:pl-5
          prose-blockquote:border-l-4 prose-blockquote:border-brand-300 prose-blockquote:pl-4 prose-blockquote:text-gray-600 prose-blockquote:italic
          prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
          prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl
          prose-img:rounded-xl prose-img:my-6"
        dangerouslySetInnerHTML={{ __html: post.content || "" }}
      />

      {related.length > 0 && (
        <div className="mt-16 border-t border-gray-100 pt-10">
          <h2 className="font-display text-xl font-bold text-gray-900 mb-6">
            Related Articles
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {related.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/blog/${p.slug}`}
                className="group flex gap-3 bg-white rounded-xl border border-gray-100 p-4 hover:border-brand-200 hover:shadow-sm transition-all"
              >
                {p.featuredImage ? (
                  <Image
                    src={p.featuredImage}
                    alt={p.title}
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                    width={64}
                    height={64}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                    <span className="text-brand-300 text-2xl">✦</span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 text-sm group-hover:text-brand-700 transition-colors line-clamp-2">
                    {p.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {p.publishedAt ? formatDate(p.publishedAt) : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
