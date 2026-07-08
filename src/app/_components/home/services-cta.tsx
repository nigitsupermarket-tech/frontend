import Link from "next/link";
import { Tag, ShoppingCart, Truck, Leaf, CreditCard } from "lucide-react";

const FEATURES = [
  { icon: ShoppingCart, label: "Free In-Store Pickup" },
  { icon: Truck, label: "Local Delivery" },
  { icon: Leaf, label: "Fresh & Quality" },
  { icon: CreditCard, label: "Easy Payments" },
];

export function ServicesCTA() {
  return (
    <section className="bg-gradient-to-r from-green-800 to-green-700 rounded-3xl mx-4 lg:mx-0 my-16 overflow-hidden">
      <div className="container py-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-3">
              Shop Fresh. Shop Smart.
            </h2>
            <p className="text-green-200 mb-6">
              From fresh produce to household essentials — find everything your
              family needs at Nigittriple Industry, Port Harcourt&apos;s
              favourite supermarket.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/products?isOnPromotion=true"
                className="flex items-center gap-2 px-6 py-3 bg-amber-400 text-gray-900 font-semibold rounded-xl hover:bg-amber-500 transition-colors"
              >
                <Tag className="w-4 h-4" /> View Promotions
              </Link>
              <Link
                href="/products"
                className="px-6 py-3 bg-white/15 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/25 transition-colors"
              >
                Browse All Products
              </Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center justify-center gap-2 bg-white/10 rounded-xl p-4 text-center"
                >
                  <Icon className="w-4 h-4 text-white shrink-0" />
                  <p className="text-white font-medium text-sm">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
