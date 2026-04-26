"use client";
import Link from "next/link";
import { ShieldCheck, Star, Truck, CreditCard, Phone, Package } from "lucide-react";

const TRUST_SIGNALS = [
  { icon: ShieldCheck, title: "Secure Payments", desc: "All transactions are processed through Paystack, Nigeria's most trusted payment gateway. Your financial data is always protected.", badge: "256-bit SSL" },
  { icon: Package, title: "Genuine Products", desc: "Every brand we stock is verified. We work directly with authorised distributors — no counterfeits, ever.", badge: "100% Authentic" },
  { icon: Truck, title: "Delivery Promise", desc: "Order by 2PM and receive same-day delivery in Port Harcourt. We notify you at every step.", badge: "Track Your Order" },
  { icon: Star, title: "Thousands of Happy Customers", desc: "Rated 4.8/5 by verified customers. Read what our community says about shopping with us.", badge: "4.8 ★ Average" },
  { icon: CreditCard, title: "Flexible Payment", desc: "Pay via card, bank transfer, or cash on delivery. We make it easy to shop the way you're comfortable.", badge: "Multiple Options" },
  { icon: Phone, title: "Real Support", desc: "Our customer support team is reachable via phone, WhatsApp, and email. We don't hide behind chatbots.", badge: "Mon–Sat 8AM–6PM" },
];

const STATS = [
  { value: "12,000+", label: "Orders delivered" },
  { value: "4.8/5", label: "Customer rating" },
  { value: "800+", label: "Products available" },
  { value: "3 years", label: "Serving Port Harcourt" },
];

export default function TrustUsPage() {
  return (
    <div className="min-h-screen">
      <section className="bg-green-800 text-white py-16">
        <div className="container text-center max-w-3xl">
          <p className="text-green-300 text-sm font-semibold uppercase tracking-widest mb-2">Your Confidence Matters</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Trust Us</h1>
          <p className="text-green-100 text-lg">Here's why thousands of families in Port Harcourt choose Nigittriple Industry for their grocery needs.</p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-amber-400 py-8">
        <div className="container max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-extrabold text-gray-900">{value}</div>
                <div className="text-sm text-gray-700 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="container max-w-6xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TRUST_SIGNALS.map(({ icon: Icon, title, desc, badge }, i) => (
              <div key={i} className="bg-white rounded-2xl p-7 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-green-700" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-100">{badge}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-white border-t border-gray-100 text-center">
        <div className="container max-w-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">See for yourself</h2>
          <p className="text-gray-500 mb-6">Join thousands of satisfied customers shopping with confidence.</p>
          <Link href="/products" className="inline-block px-8 py-3 bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 transition-colors">Start Shopping</Link>
        </div>
      </section>
    </div>
  );
}
