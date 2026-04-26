import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NewArrivalsGrid } from "./product-grids";

export function NewArrivals() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-semibold text-gold-500 uppercase tracking-wider mb-1">
              Just landed
            </p>
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-gray-900">
              New Arrivals
            </h2>
          </div>
          <Link
            href="/products?isNewArrival=true"
            className="text-sm font-medium text-brand-600 hover:text-brand-800 flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <NewArrivalsGrid />
      </div>
    </section>
  );
}
