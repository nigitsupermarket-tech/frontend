"use client";

// frontend/src/app/(guest)/brands/page.tsx

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Search } from "lucide-react";
import { apiGet } from "@/lib/api";
import { Brand } from "@/types";

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filtered, setFiltered] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiGet<any>("/brands?isActive=true&limit=200")
      .then((res) => {
        const list: Brand[] = res.data.brands || [];
        setBrands(list);
        setFiltered(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? brands.filter((b) => b.name.toLowerCase().includes(q)) : brands);
  }, [search, brands]);

  // Group alphabetically
  const groups: Record<string, Brand[]> = {};
  filtered.forEach((b) => {
    const letter = b.name[0].toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(b);
  });
  const letters = Object.keys(groups).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-green-800 text-white py-14">
        <div className="container text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">Our Brands</h1>
          <p className="text-green-200 text-lg max-w-2xl mx-auto">
            Discover all the quality brands available in our catalogue — from Nigeria's best grocery producers to trusted international labels.
          </p>
        </div>
      </section>

      <div className="container py-10">
        {/* Search */}
        <div className="max-w-md mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search brands…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-green-500 bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No brands found.</div>
        ) : (
          <div className="space-y-10">
            {letters.map((letter) => (
              <div key={letter}>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-2xl font-extrabold text-green-700 w-10">{letter}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {groups[letter].map((brand) => (
                    <Link
                      key={brand.id}
                      href={`/products?brandId=${brand.id}`}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-3 hover:border-green-400 hover:shadow-md transition-all group"
                    >
                      {brand.logo ? (
                        <div className="w-16 h-16 relative flex items-center justify-center">
                          <Image
                            src={brand.logo}
                            alt={brand.name}
                            fill
                            className="object-contain"
                            sizes="64px"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                          <span className="text-xl font-extrabold text-green-700">
                            {brand.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-semibold text-gray-800 text-center leading-tight group-hover:text-green-700 transition-colors">
                        {brand.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
