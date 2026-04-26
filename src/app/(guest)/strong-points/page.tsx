"use client";
import Link from "next/link";
import { Truck, ShieldCheck, Package, Clock, MapPin, HeartHandshake, Star, BarChart3 } from "lucide-react";

const POINTS = [
  { icon: Truck, title: "Fast Delivery", desc: "Same-day and next-day delivery options across Port Harcourt and Rivers State. We handle logistics so you don't have to.", color: "bg-green-50 text-green-700" },
  { icon: ShieldCheck, title: "Quality Guaranteed", desc: "Every product in our catalogue is sourced from trusted suppliers and undergoes quality checks before reaching you.", color: "bg-blue-50 text-blue-700" },
  { icon: Package, title: "800+ Products", desc: "An extensive catalogue covering groceries, beverages, household essentials, and more — all in one place.", color: "bg-amber-50 text-amber-700" },
  { icon: Clock, title: "Order by 2PM, Delivered Today", desc: "Cut-off time of 2PM for same-day delivery on most orders within our primary delivery zones.", color: "bg-purple-50 text-purple-700" },
  { icon: MapPin, title: "Port Harcourt Specialists", desc: "Born and built in Port Harcourt. We know the city, the routes, and your neighbourhood.", color: "bg-red-50 text-red-700" },
  { icon: HeartHandshake, title: "Personal Service", desc: "Real customer support via phone, WhatsApp, and email. We pick up and we respond.", color: "bg-teal-50 text-teal-700" },
  { icon: Star, title: "Trusted Brands Only", desc: "We only stock brands that meet our quality standards — no counterfeits, no compromises.", color: "bg-orange-50 text-orange-700" },
  { icon: BarChart3, title: "Best Prices in PH", desc: "We negotiate directly with distributors and pass the savings to you. Price-matched and transparent.", color: "bg-indigo-50 text-indigo-700" },
];

export default function StrongPointsPage() {
  return (
    <div className="min-h-screen">
      <section className="bg-green-800 text-white py-16">
        <div className="container text-center max-w-3xl">
          <p className="text-green-300 text-sm font-semibold uppercase tracking-widest mb-2">Why Choose Us</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Our Strong Points</h1>
          <p className="text-green-100 text-lg">What makes Nigittriple Industry the preferred grocery platform in Port Harcourt.</p>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="container max-w-6xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {POINTS.map(({ icon: Icon, title, desc, color }, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-white border-t border-gray-100">
        <div className="container max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to experience the Nigittriple difference?</h2>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/products" className="px-8 py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition-colors">Shop Now</Link>
            <Link href="/contact" className="px-8 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">Contact Us</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
