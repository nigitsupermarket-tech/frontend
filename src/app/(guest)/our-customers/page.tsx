"use client";
import Link from "next/link";
import Image from "next/image";
import { Store, Building2, ShoppingBag, Users } from "lucide-react";

const CUSTOMER_TYPES = [
  { icon: Store, title: "Retail Shops", desc: "Corner stores, boutique grocers, and neighbourhood kiosks across Rivers State stock our products to serve their local communities.", count: "200+" },
  { icon: Building2, title: "Hotels & Hospitality", desc: "Hotels, guesthouses, and restaurants rely on our consistent supply of quality food and beverage products.", count: "50+" },
  { icon: ShoppingBag, title: "Individual Families", desc: "Thousands of Port Harcourt families do their regular grocery shopping with us — fresh, reliable, and delivered to their door.", count: "8,000+" },
  { icon: Users, title: "Corporate Organisations", desc: "Companies order in bulk for staff canteens, events, and client hospitality through our business accounts.", count: "30+" },
];

const LOGOS = [
  { name: "Shoprite", initial: "S", color: "bg-red-50 text-red-600" },
  { name: "FoodCo", initial: "F", color: "bg-blue-50 text-blue-600" },
  { name: "BestFoods", initial: "B", color: "bg-amber-50 text-amber-600" },
  { name: "QuickMart", initial: "Q", color: "bg-green-50 text-green-600" },
  { name: "DeltaStore", initial: "D", color: "bg-purple-50 text-purple-600" },
  { name: "FreshHub", initial: "F", color: "bg-teal-50 text-teal-600" },
  { name: "SuperSave", initial: "S", color: "bg-orange-50 text-orange-600" },
  { name: "MegaBuy", initial: "M", color: "bg-indigo-50 text-indigo-600" },
];

const TESTIMONIALS = [
  { name: "Mrs. Chidinma Obi", role: "Owner, Chidinma's Provisions — Mile 3, Port Harcourt", text: "I've been ordering from Nigittriple for two years. Delivery is always on time and the prices are the best I've found anywhere in PH. My shop hasn't run out of stock since I started using them." },
  { name: "Mr. Tunde Fashola", role: "Procurement Manager, GreenLeaf Hotels", text: "We switched our entire hotel supply chain to Nigittriple six months ago. Their consistency, product range, and customer service is exactly what a business needs. Highly recommended." },
  { name: "Amaka Nwachukwu", role: "Regular customer, Rumuola", text: "As a busy mother of three, I don't have time to visit multiple markets. Nigittriple delivers everything I need to my gate. Fresh, affordable, and always on time." },
];

export default function OurCustomersPage() {
  return (
    <div className="min-h-screen">
      <section className="bg-green-800 text-white py-16">
        <div className="container text-center max-w-3xl">
          <p className="text-green-300 text-sm font-semibold uppercase tracking-widest mb-2">Who We Serve</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Our Customers</h1>
          <p className="text-green-100 text-lg">From individual families to large businesses — Nigittriple Industry serves every kind of customer across Rivers State.</p>
        </div>
      </section>

      {/* Customer types */}
      <section className="py-16 bg-gray-50">
        <div className="container max-w-6xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CUSTOMER_TYPES.map(({ icon: Icon, title, desc, count }, i) => (
              <div key={i} className="bg-white rounded-2xl p-7 border border-gray-100 hover:shadow-lg transition-shadow text-center">
                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-7 h-7 text-green-700" />
                </div>
                <div className="text-3xl font-extrabold text-green-700 mb-1">{count}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner logos placeholder */}
      <section className="py-14 bg-white border-y border-gray-100">
        <div className="container max-w-5xl text-center">
          <h2 className="text-xl font-bold text-gray-500 uppercase tracking-widest mb-10 text-sm">Trusted by businesses across Port Harcourt</h2>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {LOGOS.map(({ name, initial, color }, i) => (
              <div key={i} className={`aspect-square rounded-xl ${color} flex items-center justify-center border border-gray-100`} title={name}>
                <span className="text-2xl font-extrabold">{initial}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-green-50">
        <div className="container max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">What they say</h2>
            <p className="text-gray-500 mt-2">Real words from real customers</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, text }, i) => (
              <div key={i} className="bg-white rounded-2xl p-7 border border-green-100 shadow-sm">
                <p className="text-gray-700 text-sm leading-relaxed italic mb-5">"{text}"</p>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{name}</p>
                  <p className="text-xs text-green-700 mt-0.5">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-green-800 text-white text-center">
        <div className="container max-w-2xl">
          <h2 className="text-2xl font-bold mb-3">Are you a business? Let's talk.</h2>
          <p className="text-green-200 mb-6">We offer bulk pricing and dedicated account management for businesses ordering regularly.</p>
          <Link href="/contact" className="inline-block px-8 py-3 bg-amber-400 text-gray-900 font-bold rounded-xl hover:bg-amber-500 transition-colors">Contact Our Business Team</Link>
        </div>
      </section>
    </div>
  );
}
