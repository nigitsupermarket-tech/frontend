"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";
import { CardHero, type CardHeroSlide } from "./card-hero";

// ── Root export (page.tsx uses <Hero /> with no props) ────────────────────────
export function Hero() {
  const [cardSlides, setCardSlides] = useState<CardHeroSlide[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiGet<any>("/settings")
      .then((res) => {
        const s = res.data?.settings ?? res.data ?? {};
        setCardSlides(s.cardHeroSlides || []);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || cardSlides.length === 0) return null;

  return <CardHero slides={cardSlides} />;
}
