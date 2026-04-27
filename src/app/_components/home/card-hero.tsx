"use client";

// src/app/_components/home/card-hero.tsx
// Bell-Italia-style card hero: 3 cards per slide on desktop, 1 card per slide on mobile.
// Desktop: 3 cards side-by-side. Mobile: only image + heading visible, 1 card at a time.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CardHeroSlide {
  id?: string;
  heading: string;
  paragraph?: string;
  buttonText?: string;
  buttonUrl?: string;
  image?: string;
}

interface CardHeroProps {
  slides: CardHeroSlide[];
}

export function CardHero({ slides }: CardHeroProps) {
  // Mobile-first: start at 1, upgrade to 3 on sm+ after mount
  const [itemsPerPage, setItemsPerPage] = useState(1);
  const [page, setPage] = useState(0);
  const [transitioning, setTr] = useState(false);

  // Detect mobile vs desktop
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 640px)");
    const update = (e: MediaQueryListEvent | MediaQueryList) => {
      setItemsPerPage(e.matches ? 3 : 1);
      setPage(0); // reset to first page on resize
    };
    update(mql);
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const totalPages = Math.ceil(slides.length / itemsPerPage);

  const go = useCallback(
    (next: number) => {
      if (transitioning) return;
      setTr(true);
      setPage(next);
      setTimeout(() => setTr(false), 400);
    },
    [transitioning],
  );

  // Auto-advance every 6s
  useEffect(() => {
    if (totalPages <= 1) return;
    const id = setInterval(() => go((page + 1) % totalPages), 6000);
    return () => clearInterval(id);
  }, [totalPages, page, go]);

  if (!slides.length) return null;

  const visible = slides.slice(
    page * itemsPerPage,
    page * itemsPerPage + itemsPerPage,
  );

  return (
    <section className="bg-white border-t border-gray-100 py-4">
      <div className="container relative px-6 sm:px-4">
        {/* Card grid — 1 col on mobile, 3 on sm+ */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 gap-3 transition-opacity duration-400 ${
            transitioning ? "opacity-0" : "opacity-100"
          }`}
        >
          {visible.map((item, i) => (
            <CardItem key={`${page}-${i}`} item={item} />
          ))}
        </div>

        {/* Prev / Next controls */}
        {totalPages > 1 && (
          <>
            <button
              onClick={() => go((page - 1 + totalPages) % totalPages)}
              disabled={transitioning}
              aria-label="Previous slide"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => go((page + 1) % totalPages)}
              disabled={transitioning}
              aria-label="Next slide"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>

            {/* Dot indicators */}
            <div className="flex justify-center gap-1.5 mt-4">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === page
                      ? "bg-green-600 w-6"
                      : "bg-gray-300 w-1.5 hover:bg-gray-400"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function CardItem({ item }: { item: CardHeroSlide }) {
  const inner = (
    <div className="group flex items-stretch gap-0 bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-300 h-[120px] sm:h-[140px]">
      {/* Text column — 2/3 width */}
      <div className="flex-1 flex flex-col justify-center px-4 py-3 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="font-bold text-gray-900 text-sm sm:text-[15px] leading-tight line-clamp-2 group-hover:text-green-700 transition-colors">
            {item.heading}
          </h3>
          {item.buttonUrl && (
            <ChevronRight className="w-4 h-4 text-green-600 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
          )}
        </div>
        {/* Paragraph hidden on mobile */}
        {item.paragraph && (
          <p className="hidden sm:block text-xs text-gray-500 leading-relaxed line-clamp-3">
            {item.paragraph}
          </p>
        )}
      </div>

      {/* Image column — 1/3 width */}
      <div className="w-[100px] sm:w-[110px] flex-shrink-0 relative bg-gray-50">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.heading}
            fill
            className="object-cover"
            sizes="110px"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
            <span className="text-3xl opacity-30">🛒</span>
          </div>
        )}
      </div>
    </div>
  );

  if (item.buttonUrl) {
    return <Link href={item.buttonUrl}>{inner}</Link>;
  }
  return inner;
}
