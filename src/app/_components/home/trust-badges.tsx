"use client";

import {
  Star, Shield, Truck, Headphones, Award, Clock,
  CreditCard, Package, CheckCircle, Gift, DollarSign, Lock,
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

interface TrustBadge {
  icon: string;
  title: string;
  description: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  star: Star, shield: Shield, truck: Truck, headphones: Headphones,
  award: Award, clock: Clock, creditCard: CreditCard, package: Package,
  checkCircle: CheckCircle, gift: Gift, dollarSign: DollarSign, lock: Lock,
};

const DEFAULT_BADGES: TrustBadge[] = [
  { icon: "truck",       title: "Free Delivery",   description: "On orders over ₦50,000"      },
  { icon: "shield",      title: "Secure Payment",  description: "Powered by Paystack"          },
  { icon: "star",        title: "Quality Assured", description: "Premium verified products"    },
  { icon: "headphones",  title: "24/7 Support",    description: "Always here to help"          },
];

export function TrustBadges() {
  // ✅ Uses shared module-level cache — no extra DB hit
  const { settings, isLoading } = useSettings();

  const raw = (settings as any)?.trustBadges ?? [];
  const badges: TrustBadge[] = raw.filter((b: any) => b.title);
  const displayBadges = !isLoading && badges.length > 0 ? badges : DEFAULT_BADGES;

  return (
    <section className="border-b border-gray-100 bg-gray-50">
      <div className="container py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {displayBadges.map(({ icon, title, description }) => {
            const Icon = ICON_MAP[icon] ?? Star;
            return (
              <div key={title} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
