"use client";

import { CatalogueDownload } from "@/components/customer/catalogue-download";
import { FileText, CheckCircle } from "lucide-react";

export function CatalogueCTA() {
  const features = [
    "Complete product listings with specifications",
    "High-quality product images",
    "Current pricing and availability",
    "Easy-to-browse format",
  ];

  return (
    <section className="border-y border-gray-100 bg-gradient-to-br from-brand-50 to-gold-50">
      <div className="container py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
            <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12">
              {/* Left side - Info */}
              <div className="space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-100">
                  <FileText className="w-8 h-8 text-brand-600" />
                </div>

                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    Download Our Product Catalogue
                  </h2>
                  <p className="text-gray-600">
                    Browse our complete range of premium products at your
                    convenience. Download our comprehensive catalogue in PDF
                    format.
                  </p>
                </div>

                <ul className="space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right side - CTA */}
              <div className="flex flex-col justify-center items-center text-center space-y-6 bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-8">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-white" />
                </div>

                <div className="text-white space-y-2">
                  <p className="text-lg font-semibold">Ready to explore?</p>
                  <p className="text-sm text-brand-100">
                    Get instant access to our full catalogue
                  </p>
                </div>

                <CatalogueDownload
                  variant="button"
                  className="bg-white !text-brand-600 hover:bg-brand-50 px-8 py-4 text-base"
                />

                <p className="text-xs text-brand-100">
                  PDF format • Free download • Always up to date
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
