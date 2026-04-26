// src/app/(guest)/page.tsx
// Homepage now lives inside the (guest) route group.
// Header, Footer, and CartDrawer are provided by (guest)/layout.tsx —
// do NOT import them here.
//
// IMPORTANT: Delete src/app/page.tsx after placing this file.
// Both cannot exist simultaneously — they both resolve to "/" and
// the conflict corrupts Next.js client-side routing after the first load.

import { PromotionsOfTheWeek } from "../_components/home/promotions-of-the-week";
import {
  Hero,
  TrustBadges,
  FeaturedProducts,
  NewArrivals,
  ServicesCTA,
  ShopByCategory,
  CatalogueCTA,
} from "../_components/home";
import { NewsletterSection } from "../_components/home/newsletter-section";

export default function HomePage() {
  return (
    <div>
      <Hero />
      <PromotionsOfTheWeek />
      <TrustBadges />
      <FeaturedProducts />
      <ShopByCategory />
      <NewArrivals />
      <CatalogueCTA />
      <ServicesCTA />
      <NewsletterSection />
    </div>
  );
}
