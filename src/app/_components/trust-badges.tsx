"use client";
import { Star, Shield, Truck, Headphones } from "lucide-react";

export function TrustBadges() {
  const badges = [
    {
      icon: Truck,
      title: "Free Delivery",
      description: "On orders over ₦50,000",
    },
    {
      icon: Shield,
      title: "Secure Payment",
      description: "Powered by Paystack",
    },
    {
      icon: Star,
      title: "Quality Assured",
      description: "Premium verified products",
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      description: "Always here to help",
    },
  ];

  return (
    <section className="border-b border-gray-100 bg-gray-50">
      <div className="container py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {badges.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
