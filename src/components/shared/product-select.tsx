"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";

interface ProductSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function ProductSelect({ value, onChange, error }: ProductSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { products, isLoading } = useProducts({
    search: search || undefined,
    limit: 50,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedProduct = products.find((p) => p.name === value);

  const handleSelect = (productName: string) => {
    onChange(productName);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange("");
    setSearch("");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-3 py-2 rounded-lg border text-sm text-left focus:outline-none focus:border-brand-500 transition-colors flex items-center justify-between",
          error ? "border-red-300" : "border-gray-200",
          value ? "text-gray-900" : "text-gray-400",
        )}
      >
        <span className="truncate">
          {selectedProduct?.name || value || "Select a product..."}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-gray-400 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500"
                autoFocus
              />
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-48">
            {isLoading ? (
              <div className="p-3 text-center text-sm text-gray-500">
                Loading products...
              </div>
            ) : products.length === 0 ? (
              <div className="p-3 text-center text-sm text-gray-500">
                {search ? "No products found" : "No products available"}
              </div>
            ) : (
              products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelect(product.name)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center justify-between",
                    product.name === value && "bg-brand-50 text-brand-700",
                  )}
                >
                  <span className="truncate">{product.name}</span>
                  {product.stockQuantity <= 0 && (
                    <span className="text-xs text-red-500 ml-2">
                      Out of stock
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Manual Entry Option */}
          {search && !products.some((p) => p.name === search) && (
            <div className="border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleSelect(search)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors text-brand-600"
              >
                Use "{search}" (custom product)
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
