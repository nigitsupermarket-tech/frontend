"use client";
import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

const PLACEHOLDER_IMAGES = [
  { src: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80", alt: "Fresh produce at Nigittriple" },
  { src: "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=600&q=80", alt: "Our warehouse" },
  { src: "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=600&q=80", alt: "Delivery team" },
  { src: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80", alt: "Product selection" },
  { src: "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=600&q=80", alt: "Fresh groceries" },
  { src: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80", alt: "Customer service" },
  { src: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80", alt: "Our store" },
  { src: "https://images.unsplash.com/photo-1585155784229-aff921ccfa43?w=600&q=80", alt: "Beverages section" },
  { src: "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=600&q=80", alt: "Team at work" },
];

export default function GalleryPage() {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      <section className="bg-green-800 text-white py-16">
        <div className="container text-center max-w-3xl">
          <p className="text-green-300 text-sm font-semibold uppercase tracking-widest mb-2">See Us in Action</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Gallery</h1>
          <p className="text-green-100 text-lg">A glimpse into our operations, our people, and our products.</p>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="container max-w-6xl">
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {PLACEHOLDER_IMAGES.map(({ src, alt }, i) => (
              <button
                key={i}
                onClick={() => setLightbox(src)}
                className="block w-full overflow-hidden rounded-xl border border-gray-200 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 break-inside-avoid"
              >
                <Image
                  src={src}
                  alt={alt}
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors">
            <X className="w-8 h-8" />
          </button>
          <div className="relative max-w-5xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <Image src={lightbox} alt="Gallery image" width={1200} height={800} className="w-full h-auto max-h-[90vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
