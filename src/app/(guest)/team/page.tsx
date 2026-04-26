"use client";
import { useSettings } from "@/hooks/useSettings";
import Link from "next/link";
import Image from "next/image";
import { Linkedin, Mail } from "lucide-react";

const DEFAULT_TEAM = [
  { name: "Adaeze Okonkwo", role: "Chief Executive Officer", bio: "15+ years in FMCG distribution across West Africa. Passionate about connecting Nigerian consumers with quality products.", initials: "AO" },
  { name: "Emeka Chukwu", role: "Head of Operations", bio: "Logistics and supply chain expert ensuring our products reach you fresh and on time across Rivers State.", initials: "EC" },
  { name: "Fatima Aliyu", role: "Customer Experience Lead", bio: "Dedicated to making every shopping experience seamless, from browsing to your doorstep delivery.", initials: "FA" },
  { name: "Chidi Okafor", role: "Product & Brand Manager", bio: "Curates our catalogue of 800+ products, building relationships with the best local and international brands.", initials: "CO" },
];

export default function TeamPage() {
  const { settings } = useSettings();
  const team: any[] = (settings as any).aboutUsTeam?.length ? (settings as any).aboutUsTeam : DEFAULT_TEAM;

  return (
    <div className="min-h-screen">
      <section className="bg-green-800 text-white py-16">
        <div className="container text-center max-w-3xl">
          <p className="text-green-300 text-sm font-semibold uppercase tracking-widest mb-2">The People Behind Nigittriple</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Our Team</h1>
          <p className="text-green-100 text-lg">Meet the dedicated individuals working every day to bring quality groceries to your home across Port Harcourt.</p>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="container max-w-6xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow text-center">
                {member.image ? (
                  <div className="aspect-square bg-gray-100 relative">
                    <Image src={member.image} alt={member.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="aspect-square bg-green-50 flex items-center justify-center">
                    <span className="text-5xl font-extrabold text-green-600">{member.initials || member.name?.charAt(0)}</span>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
                  <p className="text-green-600 text-sm font-semibold mb-3">{member.role}</p>
                  {member.bio && <p className="text-sm text-gray-500 leading-relaxed">{member.bio}</p>}
                  <div className="flex justify-center gap-3 mt-4">
                    {member.linkedin && <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-green-600 transition-colors"><Linkedin className="w-4 h-4" /></a>}
                    {member.email && <a href={`mailto:${member.email}`} className="text-gray-400 hover:text-green-600 transition-colors"><Mail className="w-4 h-4" /></a>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-green-800 text-white text-center">
        <div className="container max-w-2xl">
          <h2 className="text-2xl font-bold mb-3">Want to join our team?</h2>
          <p className="text-green-200 mb-6">We're always looking for passionate people to help us grow.</p>
          <Link href="/contact" className="inline-block px-8 py-3 bg-amber-400 text-gray-900 font-bold rounded-xl hover:bg-amber-500 transition-colors">Get in Touch</Link>
        </div>
      </section>
    </div>
  );
}
