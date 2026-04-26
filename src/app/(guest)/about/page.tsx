"use client";

import { useSettings } from "@/hooks/useSettings";
import {
  Target,
  Eye,
  Award,
  Users,
  TrendingUp,
  Globe,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const iconMap: Record<string, any> = {
  target: Target,
  eye: Eye,
  award: Award,
  users: Users,
  trending: TrendingUp,
  globe: Globe,
  check: CheckCircle,
};

export default function AboutUsPage() {
  // ✅ FIX: Removed `if (isLoading) return <PageLoader />`.
  //
  // That guard was the root cause of the "second page never loads" bug.
  // On every client-side navigation Next.js re-mounts this component, which
  // calls useSettings() which fires a fresh fetch while isLoading=true,
  // causing the whole page to be replaced by a spinner. If the backend is
  // slow (>2 s) or the tab was idle, the spinner never cleared and the user
  // saw a blank/stuck page.
  //
  // The fix: render immediately using whatever settings are in the cache
  // (usually populated from the first page load). Strings that depend on
  // settings simply render as empty/default until the fetch resolves —
  // which is imperceptible in practice because the cache is hit instantly.
  const { settings } = useSettings();

  const values = (settings as any).aboutUsValues || [];
  const team = (settings as any).aboutUsTeam || [];
  const stats = (settings as any).aboutUsStats || [];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-brand-700 to-brand-600 text-white py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
              {(settings as any).aboutUsTitle || "About Us"}
            </h1>
            <p className="text-lg text-brand-100">
              Port Harcourt&apos;s premier grocery supermarket — quality
              products, trusted brands
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      {(settings as any).aboutUsContent && (
        <section className="py-16">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              {(settings as any).aboutUsImage && (
                <div className="order-2 lg:order-1">
                  <Image
                    src={(settings as any).aboutUsImage}
                    alt="About Us"
                    className="w-full rounded-2xl shadow-xl"
                    width={600}
                    height={400}
                  />
                </div>
              )}
              <div className="order-1 lg:order-2">
                <div
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: (settings as any).aboutUsContent,
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Mission & Vision */}
      {((settings as any).aboutUsMission ||
        (settings as any).aboutUsVision) && (
        <section className="py-16 bg-gray-50">
          <div className="container max-w-5xl">
            <div className="grid md:grid-cols-2 gap-8">
              {(settings as any).aboutUsMission && (
                <div className="bg-white rounded-2xl p-8 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-brand-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Our Mission
                  </h2>
                  <p className="text-gray-600 leading-relaxed">
                    {(settings as any).aboutUsMission}
                  </p>
                </div>
              )}
              {(settings as any).aboutUsVision && (
                <div className="bg-white rounded-2xl p-8 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-gold-100 flex items-center justify-center mb-4">
                    <Eye className="w-6 h-6 text-gold-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Our Vision
                  </h2>
                  <p className="text-gray-600 leading-relaxed">
                    {(settings as any).aboutUsVision}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Values */}
      {values.length > 0 && (
        <section className="py-16">
          <div className="container max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">
                Our Core Values
              </h2>
              <p className="text-gray-600">
                The principles that guide everything we do
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {values.map((value: any, i: number) => {
                const Icon = iconMap[value.icon] || Award;
                return (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-brand-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {value.title}
                    </h3>
                    <p className="text-sm text-gray-600">{value.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      {stats.length > 0 && (
        <section className="py-16 bg-brand-700 text-white">
          <div className="container max-w-5xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat: any, i: number) => {
                const Icon = iconMap[stat.icon] || TrendingUp;
                return (
                  <div key={i} className="text-center">
                    <Icon className="w-8 h-8 mx-auto mb-3 text-gold-400" />
                    <div className="text-4xl font-bold mb-1">{stat.value}</div>
                    <div className="text-sm text-brand-200">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Team */}
      {team.length > 0 && (
        <section className="py-16">
          <div className="container max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">
                Meet Our Team
              </h2>
              <p className="text-gray-600">The people behind our success</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {team.map((member: any, i: number) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow"
                >
                  {member.image && (
                    <div className="aspect-square bg-gray-100">
                      <Image
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover"
                        width={400}
                        height={400}
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {member.name}
                    </h3>
                    <p className="text-brand-600 text-sm font-medium mb-3">
                      {member.role}
                    </p>
                    {member.bio && (
                      <p className="text-sm text-gray-600">{member.bio}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="container max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">
            Shop with NigitTriple Today
          </h2>
          <p className="text-gray-600 mb-8">
            Browse 800+ quality products and get them delivered to your door
            across Port Harcourt
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="px-8 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors"
            >
              Contact Us
            </Link>
            <Link
              href="/products"
              className="px-8 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
