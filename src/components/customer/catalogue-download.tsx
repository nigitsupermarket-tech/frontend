"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";

interface CatalogueDownloadProps {
  variant?: "button" | "banner";
  categoryId?: string;
  featuredOnly?: boolean;
  className?: string;
}

export function CatalogueDownload({
  variant = "button",
  categoryId,
  featuredOnly = false,
  className = "",
}: CatalogueDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      const params = new URLSearchParams();
      if (categoryId) params.append("categoryId", categoryId);
      if (featuredOnly) params.append("featured", "true");

      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}/export/catalogue/pdf?${params.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `product-catalogue-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download catalogue. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (variant === "banner") {
    return (
      <div
        className={`bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-8 text-white ${className}`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Download Product Catalogue</h3>
              <p className="text-brand-100 text-sm mt-1">
                Get our complete product catalogue in PDF format
              </p>
            </div>
          </div>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-6 py-3 bg-white text-brand-600 rounded-xl font-semibold hover:bg-brand-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={`flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isDownloading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Downloading...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Download Catalogue
        </>
      )}
    </button>
  );
}
