"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Star,
  ThumbsUp,
  Trash2,
  Edit2,
  X,
  Check,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete, getApiError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/store/uiStore";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ReviewUser {
  id: string;
  name: string;
  image?: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  images: string[];
  isVerified: boolean;
  isApproved: boolean;
  createdAt: string;
  user: ReviewUser;
}

interface ReviewsData {
  reviews: Review[];
  averageRating: number;
  pagination: { total: number; totalPages: number; page: number };
}

// ─── Star rating input ────────────────────────────────────────────────────────
function StarInput({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === "lg" ? "w-8 h-8" : size === "md" ? "w-6 h-6" : "w-4 h-4";

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = (hovered || value) > i;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange?.(i + 1)}
            onMouseEnter={() => onChange && setHovered(i + 1)}
            onMouseLeave={() => onChange && setHovered(0)}
            disabled={!onChange}
            className={cn(
              "transition-colors",
              onChange ? "cursor-pointer" : "cursor-default",
            )}
          >
            <Star
              className={cn(
                sz,
                filled ? "fill-amber-400 text-amber-400" : "text-gray-200",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

// ─── Rating breakdown bar ─────────────────────────────────────────────────────
function RatingBar({
  count,
  total,
  star,
}: {
  count: number;
  total: number;
  star: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className="w-4 text-right">{star}</span>
      <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6">{count}</span>
    </div>
  );
}

// ─── Single review card ───────────────────────────────────────────────────────
function ReviewCard({
  review,
  currentUserId,
  onDelete,
  onEdit,
}: {
  review: Review;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onEdit: (review: Review) => void;
}) {
  const isOwner = currentUserId === review.user.id;
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  return (
    <>
      <div className="py-5 border-b border-gray-100 last:border-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700 shrink-0">
              {review.user.image ? (
                <Image
                  src={review.user.image}
                  alt={review.user.name}
                  className="w-full h-full rounded-full object-cover"
                  width={36}
                  height={36}
                />
              ) : (
                review.user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900 text-sm">
                  {review.user.name}
                </span>
                {review.isVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                    <Check className="w-3 h-3" /> Verified Purchase
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDate(review.createdAt)}
              </p>
            </div>
          </div>

          {/* Actions */}
          {isOwner && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(review)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                title="Edit review"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(review.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Delete review"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-2.5 ml-12">
          <StarInput value={review.rating} size="sm" />
          {review.comment && (
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
              {review.comment}
            </p>
          )}

          {/* Review images */}
          {review.images && review.images.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {review.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxSrc(img)}
                  className="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 hover:border-brand-300 transition-colors"
                >
                  <Image
                    src={img}
                    alt={`Review image ${i + 1}`}
                    className="w-full h-full object-cover"
                    width={64}
                    height={64}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-lg">
            <X className="w-6 h-6" />
          </button>
          <Image
            src={lightboxSrc}
            alt="Review"
            className="max-w-full max-h-[90vh] rounded-xl"
            width={800}
            height={600}
          />
        </div>
      )}
    </>
  );
}

// ─── Review form ──────────────────────────────────────────────────────────────
function ReviewForm({
  productId,
  editReview,
  onSuccess,
  onCancel,
}: {
  productId: string;
  editReview?: Review | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [rating, setRating] = useState(editReview?.rating || 0);
  const [comment, setComment] = useState(editReview?.comment || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast("Please select a rating", "error");
      return;
    }
    setSaving(true);
    try {
      if (editReview) {
        await apiPut(`/reviews/${editReview.id}`, { rating, comment });
        toast("Review updated!", "success");
      } else {
        await apiPost("/reviews", { productId, rating, comment });
        toast("Review submitted! It will appear once approved.", "success");
      }
      onSuccess();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-50 rounded-2xl p-5 space-y-4"
    >
      <h3 className="font-semibold text-gray-900">
        {editReview ? "Edit Your Review" : "Write a Review"}
      </h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Rating *
        </label>
        <StarInput value={rating} onChange={setRating} size="lg" />
        {rating > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Review{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Share your experience with this product…"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 resize-none transition-colors"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || rating === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {editReview ? "Update Review" : "Submit Review"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuthStore();
  const toast = useToast();

  const [data, setData] = useState<ReviewsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterRating, setFilterRating] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editReview, setEditReview] = useState<Review | null>(null);

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { productId, page, limit: 8 };
      if (filterRating > 0) params.rating = filterRating;
      const res = await apiGet<any>("/reviews", params);
      setData(res.data);
    } catch {
      toast("Failed to load reviews", "error");
    } finally {
      setIsLoading(false);
    }
  }, [productId, page, filterRating]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    try {
      await apiDelete(`/reviews/${id}`);
      toast("Review deleted", "success");
      fetchReviews();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const handleEditClick = (review: Review) => {
    setEditReview(review);
    setShowForm(true);
    window.scrollTo({
      top: document.getElementById("reviews-section")?.offsetTop ?? 0,
      behavior: "smooth",
    });
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditReview(null);
    fetchReviews();
  };

  // Compute rating breakdown from current page (approximation)
  const ratingCounts = Array.from(
    { length: 5 },
    (_, i) => (data?.reviews || []).filter((r) => r.rating === i + 1).length,
  );
  const total = data?.pagination.total ?? 0;
  const avg = data?.averageRating ?? 0;

  // Check if current user has already reviewed
  const userReview = data?.reviews.find((r) => r.user.id === user?.id);

  return (
    <div id="reviews-section" className="space-y-6">
      {/* Summary */}
      <div className="flex flex-col sm:flex-row gap-6 bg-gray-50 rounded-2xl p-6">
        {/* Average */}
        <div className="flex flex-col items-center justify-center sm:w-36 shrink-0">
          <span className="text-5xl font-bold text-gray-900">
            {avg.toFixed(1)}
          </span>
          <StarInput value={Math.round(avg)} size="sm" />
          <p className="text-xs text-gray-400 mt-1">
            {total} review{total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => (
            <RatingBar
              key={star}
              star={star}
              count={ratingCounts[star - 1]}
              total={data?.reviews.length ?? 0}
            />
          ))}
        </div>
      </div>

      {/* Write review CTA / form */}
      {user ? (
        !userReview || editReview ? (
          showForm ? (
            <ReviewForm
              productId={productId}
              editReview={editReview}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setShowForm(false);
                setEditReview(null);
              }}
            />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-medium text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-colors"
            >
              + Write a Review
            </button>
          )
        ) : null
      ) : (
        <div className="bg-brand-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-600">
            <Link
              href="/login"
              className="text-brand-600 font-medium hover:underline"
            >
              Sign in
            </Link>{" "}
            to leave a review
          </p>
        </div>
      )}

      {/* Filter by rating */}
      {total > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Filter:</span>
          <button
            onClick={() => {
              setFilterRating(0);
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filterRating === 0
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            All
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => {
                setFilterRating(star);
                setPage(1);
              }}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filterRating === star
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              )}
            >
              <Star className="w-3 h-3 fill-current" /> {star}
            </button>
          ))}
        </div>
      )}

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="py-5 border-b border-gray-100 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200" />
                <div className="space-y-1.5">
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                  <div className="h-2.5 w-16 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="ml-12 mt-3 space-y-2">
                <div className="h-3 w-full bg-gray-100 rounded" />
                <div className="h-3 w-3/4 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.reviews.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          {filterRating > 0
            ? `No ${filterRating}-star reviews yet.`
            : "No reviews yet. Be the first to review this product!"}
        </div>
      ) : (
        <div>
          {data.reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={user?.id}
              onDelete={handleDelete}
              onEdit={handleEditClick}
            />
          ))}

          {/* Pagination */}
          {(data.pagination.totalPages ?? 1) > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-40 hover:border-brand-300 transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">
                {page} / {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= data.pagination.totalPages}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-40 hover:border-brand-300 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
