"use client";
import { useState, useEffect } from "react";
import { Star, ThumbsUp } from "lucide-react";
import { apiGet } from "@/lib/api";
import Link from "next/link";

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user?: { name: string; image?: string };
  product?: { name: string; slug: string };
}

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${cls} ${s <= rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`} />
      ))}
    </div>
  );
}

const FEATURED = [
  { name: "Adaeze C.", location: "GRA, Port Harcourt", rating: 5, text: "Outstanding service! I ordered on Monday morning and received everything by noon. The products were all genuine and well-packaged. This is now my go-to grocery app." },
  { name: "Emmanuel O.", location: "Rumuola, Port Harcourt", rating: 5, text: "Very impressed with the variety of products. I found brands I couldn't find anywhere else in Port Harcourt. The price comparison with other places shows Nigittriple is genuinely cheaper." },
  { name: "Ngozi B.", location: "Trans-Amadi", rating: 4, text: "Great platform overall. Delivery was a bit late once but they called ahead to let me know. Customer service was responsive and offered a discount on my next order. Will keep using." },
  { name: "Ifeanyi M.", location: "Diobu, Port Harcourt", rating: 5, text: "As a shop owner I buy in bulk here. The pricing is transparent and they've never let me down on stock. My business depends on reliable suppliers and Nigittriple delivers." },
  { name: "Blessing A.", location: "Eliozu", rating: 5, text: "I love how easy the website is to use. I found what I needed quickly, payment was smooth through Paystack, and delivery was professional. Highly recommend to anyone in PH." },
  { name: "Chukwuemeka P.", location: "Peter Odili Road", rating: 4, text: "Good selection and fair prices. Would love to see more local brands added. But overall the experience is much better than going to the market physically." },
];

const RATING_DIST = [
  { stars: 5, pct: 72 },
  { stars: 4, pct: 18 },
  { stars: 3, pct: 6 },
  { stars: 2, pct: 2 },
  { stars: 1, pct: 2 },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<any>("/reviews?limit=12&sort=recent")
      .then((res) => setReviews(res.data?.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <section className="bg-green-800 text-white py-16">
        <div className="container text-center max-w-3xl">
          <p className="text-green-300 text-sm font-semibold uppercase tracking-widest mb-2">What People Are Saying</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Customer Reviews</h1>
          <p className="text-green-100 text-lg">Honest feedback from the families and businesses who shop with us every day.</p>
        </div>
      </section>

      {/* Overall rating summary */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="container max-w-3xl">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="text-center shrink-0">
              <div className="text-7xl font-extrabold text-green-700">4.8</div>
              <StarRow rating={5} size="lg" />
              <p className="text-sm text-gray-500 mt-2">Based on 2,400+ reviews</p>
            </div>
            <div className="flex-1 w-full space-y-2">
              {RATING_DIST.map(({ stars, pct }) => (
                <div key={stars} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-600 w-6 text-right">{stars}★</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8">{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured testimonials */}
      <section className="py-16 bg-gray-50">
        <div className="container max-w-6xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Featured Reviews</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURED.map(({ name, location, rating, text }, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow flex flex-col">
                <StarRow rating={rating} />
                <p className="text-sm text-gray-700 leading-relaxed italic mt-4 flex-1">"{text}"</p>
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="font-bold text-gray-900 text-sm">{name}</p>
                  <p className="text-xs text-gray-400">{location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live product reviews from API */}
      {!loading && reviews.length > 0 && (
        <section className="py-16 bg-white border-t border-gray-100">
          <div className="container max-w-5xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Recent Product Reviews</h2>
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="flex gap-4 p-5 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-green-700">{r.user?.name?.charAt(0) ?? "A"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900">{r.user?.name ?? "Customer"}</span>
                      <StarRow rating={r.rating} />
                      <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}</span>
                    </div>
                    {r.product && (
                      <Link href={`/products/${r.product.slug}`} className="text-xs text-green-600 hover:underline">
                        {r.product.name}
                      </Link>
                    )}
                    {r.comment && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{r.comment}</p>}
                  </div>
                  <ThumbsUp className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-12 bg-green-800 text-white text-center">
        <div className="container max-w-2xl">
          <h2 className="text-2xl font-bold mb-3">Share your experience</h2>
          <p className="text-green-200 mb-6">Ordered from us? We'd love to hear what you think.</p>
          <Link href="/account/orders" className="inline-block px-8 py-3 bg-amber-400 text-gray-900 font-bold rounded-xl hover:bg-amber-500 transition-colors">Leave a Review</Link>
        </div>
      </section>
    </div>
  );
}
