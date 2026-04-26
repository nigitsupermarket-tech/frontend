"use client";
import { useSettings } from "@/hooks/useSettings";

const DEFAULT_VALUES = [
  { icon: "🌱", title: "Quality First", desc: "We never compromise on product quality. Every item we sell meets strict standards for freshness, authenticity, and safety." },
  { icon: "🤝", title: "Customer Trust", desc: "Our customers are our community. We build every interaction on transparency, honesty, and genuine care." },
  { icon: "⚡", title: "Reliability", desc: "Whether it's delivery times, product availability, or support — we do what we say, every single time." },
  { icon: "🌍", title: "Community", desc: "We're proud to be a Port Harcourt business. We hire locally, source locally where possible, and invest in the city we serve." },
  { icon: "♻️", title: "Sustainability", desc: "Reducing waste in our logistics, choosing eco-friendly packaging, and making responsible sourcing decisions." },
  { icon: "💡", title: "Innovation", desc: "We embrace technology to make grocery shopping simpler, faster, and more enjoyable for every customer." },
];

export default function OurValuesPage() {
  const { settings } = useSettings();
  const values: any[] = (settings as any).aboutUsValues?.length ? (settings as any).aboutUsValues : DEFAULT_VALUES;

  return (
    <div className="min-h-screen">
      <section className="bg-green-800 text-white py-16">
        <div className="container text-center max-w-3xl">
          <p className="text-green-300 text-sm font-semibold uppercase tracking-widest mb-2">What Drives Us</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Our Values</h1>
          <p className="text-green-100 text-lg">The principles that guide every decision, every product choice, and every delivery we make.</p>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="container max-w-5xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all">
                <div className="text-4xl mb-4">{v.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{v.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.description || v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-green-50 border-t border-green-100">
        <div className="container max-w-3xl text-center">
          <p className="text-2xl font-bold text-green-900 italic leading-relaxed">
            "We believe that access to quality groceries isn't a luxury — it's something every family in Port Harcourt deserves."
          </p>
          <p className="mt-4 text-green-700 font-semibold">— The Nigittriple Team</p>
        </div>
      </section>
    </div>
  );
}
