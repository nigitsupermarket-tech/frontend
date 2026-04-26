"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Eye,
  Image as ImageIcon,
  Trash2,
  Code,
} from "lucide-react";
import { apiPost, apiGet, apiPut, apiDelete, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { generateSlug } from "@/lib/utils";
import { DragDropMediaUploader } from "@/components/shared/drag-drop-media-uploader";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { PageLoader } from "@/components/shared/loading-spinner";

interface MediaItem {
  url: string;
  publicId?: string;
  type: "image" | "video";
  width?: number;
  height?: number;
}

export default function EditBlogPostPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [featuredMedia, setFeaturedMedia] = useState<MediaItem[]>([]);
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featuredImage: "",
    categoryId: "",
    tags: "",
    status: "DRAFT" as "DRAFT" | "PUBLISHED" | "ARCHIVED",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [postRes, catsRes] = await Promise.all([
          apiGet<any>(`/blog/posts/${id}`),
          apiGet<any>("/blog/categories"),
        ]);

        const post = postRes.data.post;
        setCategories(catsRes.data.categories);

        setForm({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt || "",
          content: post.content || "",
          featuredImage: post.featuredImage || "",
          categoryId: post.categoryId || "",
          tags: post.tags?.join(", ") || "",
          status: post.status,
        });

        // Set featured image if exists
        if (post.featuredImage) {
          setFeaturedMedia([
            {
              url: post.featuredImage,
              type: "image",
            },
          ]);
        }
      } catch (err) {
        toast("Failed to load post", "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Update featuredImage field when media changes
  useEffect(() => {
    if (featuredMedia.length > 0) {
      setForm((p) => ({ ...p, featuredImage: featuredMedia[0].url }));
    } else {
      setForm((p) => ({ ...p, featuredImage: "" }));
    }
  }, [featuredMedia]);

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: publish ? "PUBLISHED" : form.status,
        categoryId: form.categoryId || undefined,
        featuredImage: form.featuredImage || undefined,
        excerpt: form.excerpt || undefined,
      };
      await apiPut(`/blog/posts/${id}`, payload);
      toast(publish ? "Post published!" : "Changes saved", "success");
      router.push("/admin/blog");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this blog post? This action cannot be undone."))
      return;

    setDeleting(true);
    try {
      await apiDelete(`/blog/posts/${id}`);
      toast("Post deleted", "success");
      router.push("/admin/blog");
    } catch (err) {
      toast(getApiError(err), "error");
      setDeleting(false);
    }
  };

  const f = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 transition-colors";

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/blog"
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">
          Edit Blog Post
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 disabled:opacity-60 transition-colors"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete
          </button>
          <button
            onClick={(e) => handleSubmit(e as any, false)}
            disabled={saving}
            className="px-5 py-2.5 border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            Save Changes
          </button>
          <button
            onClick={(e) => handleSubmit(e as any, true)}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {form.status === "PUBLISHED" ? "Update" : "Publish"}
          </button>
        </div>
      </div>

      <form
        onSubmit={(e) => handleSubmit(e, false)}
        className="grid lg:grid-cols-3 gap-5"
      >
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Title *
              </label>
              <input
                value={form.title}
                onChange={(e) => f("title", e.target.value)}
                required
                className={inputCls}
                placeholder="Enter post title…"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Slug *
              </label>
              <input
                value={form.slug}
                onChange={(e) => f("slug", e.target.value)}
                required
                className={inputCls + " font-mono text-xs"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Excerpt
              </label>
              <textarea
                value={form.excerpt}
                onChange={(e) => f("excerpt", e.target.value)}
                rows={2}
                className={inputCls + " resize-none"}
                placeholder="Brief summary shown in listings…"
              />
            </div>
          </div>

          {/* Content Editor */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Content *
              </label>
              <button
                type="button"
                onClick={() => setShowHtmlEditor(!showHtmlEditor)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:text-brand-600 border border-gray-200 rounded-lg hover:border-brand-300 transition-colors"
              >
                <Code className="w-3.5 h-3.5" />
                {showHtmlEditor ? "Visual Editor" : "HTML Editor"}
              </button>
            </div>

            {showHtmlEditor ? (
              <div>
                <textarea
                  value={form.content}
                  onChange={(e) => f("content", e.target.value)}
                  rows={25}
                  required
                  className={
                    inputCls + " resize-none font-mono text-xs leading-relaxed"
                  }
                  placeholder="Write your post content here (HTML)…"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Tip: You can use basic HTML tags like &lt;p&gt;, &lt;h2&gt;,
                  &lt;strong&gt;, &lt;ul&gt;, &lt;img&gt;, etc.
                </p>
              </div>
            ) : (
              <RichTextEditor
                value={form.content}
                onChange={(value) => f("content", value)}
                placeholder="Write your post content here..."
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Settings</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => f("status", e.target.value)}
                className={inputCls + " bg-white"}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Category
              </label>
              <select
                value={form.categoryId}
                onChange={(e) => f("categoryId", e.target.value)}
                className={inputCls + " bg-white"}
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Tags (comma-separated)
              </label>
              <input
                value={form.tags}
                onChange={(e) => f("tags", e.target.value)}
                className={inputCls}
                placeholder="business, tips, marketing"
              />
            </div>
          </div>

          {/* Featured Image Upload */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Featured Image</h2>
            </div>

            <DragDropMediaUploader
              value={featuredMedia}
              onChange={setFeaturedMedia}
              maxFiles={1}
              folder="blog"
              accept="image"
              label=""
              helperText="Upload or paste image URL. This will be the main image for your blog post."
              showPreview={true}
            />

            {/* Show current image URL if exists */}
            {form.featuredImage && (
              <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 truncate">
                  {form.featuredImage}
                </p>
              </div>
            )}
          </div>

          {/* Preview Button */}
          {form.slug && form.content && (
            <Link
              href={`/blog/${form.slug}`}
              target="_blank"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview Post
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
