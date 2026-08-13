// frontend/src/components/admin/pos/WeighModal.tsx
"use client";

import { X, Scale as ScaleIcon, AlertCircle } from "lucide-react";
import { useScale } from "@/lib/scale/ScaleContext";
import { formatPrice } from "@/lib/utils";

// Minimal shape this modal needs — structurally compatible with the
// (much bigger) `Product` type defined in the POS page, so no import
// coupling is required in either direction.
export interface WeighableProduct {
  id: string;
  name: string;
  price: number;
  pricePerUnit?: number;
  scaleUnit?: string;
  minOrderQty?: number;
  maxOrderQty?: number;
  scaleStep?: number;
  trackInventory: boolean;
  stockQuantity: number;
}

function toDisplayUnit(weightKg: number, unit: string): number {
  if (unit === "g") return weightKg * 1000;
  return weightKg;
}

export default function WeighModal({
  product,
  onClose,
  onAdd,
  onAddManually,
}: {
  product: WeighableProduct;
  onClose: () => void;
  onAdd: (product: WeighableProduct, weightKg: number) => void;
  onAddManually: (product: WeighableProduct) => void;
}) {
  const scale = useScale();
  const unit = product.scaleUnit || "kg";
  const unitPrice = product.pricePerUnit ?? product.price;

  const weightKg = scale.weightKg ?? 0;
  const weightInUnit = toDisplayUnit(weightKg, unit);
  const estimatedPrice = weightInUnit * unitPrice;

  const maxStock = product.trackInventory ? product.stockQuantity : Infinity;
  const maxQty = product.maxOrderQty ? Math.min(product.maxOrderQty, maxStock) : maxStock;
  const minQty = product.minOrderQty || product.scaleStep || 0;

  const belowMin = weightInUnit > 0 && weightInUnit < minQty;
  const aboveMax = weightInUnit > maxQty;
  const canAdd =
    scale.status === "connected" &&
    weightInUnit > 0 &&
    !belowMin &&
    !aboveMax &&
    scale.isStable;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900 line-clamp-2">{product.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatPrice(unitPrice)}/{unit}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {scale.status !== "connected" ? (
          <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Scale isn&apos;t connected. Tap the ⚖ button in the toolbar to
              connect it, or add this item manually below.
            </span>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-xl p-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                On the scale
              </p>
              <p className="text-3xl font-black text-gray-900 tabular-nums">
                {weightInUnit.toFixed(unit === "g" ? 0 : 3)}{" "}
                <span className="text-sm font-semibold text-gray-400">{unit}</span>
              </p>
              <p className="text-sm font-bold text-green-700 mt-1">
                ≈ {formatPrice(estimatedPrice)}
              </p>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                scale.isStable ? "bg-green-600 text-white" : "bg-amber-400 text-white"
              }`}
            >
              {scale.isStable ? "Stable" : "Settling…"}
            </span>
          </div>
        )}

        {scale.status === "connected" && belowMin && weightInUnit > 0 && (
          <p className="mt-2 text-[11px] text-red-600">
            Minimum sale is {minQty} {unit}. Add more to the scale.
          </p>
        )}
        {scale.status === "connected" && aboveMax && (
          <p className="mt-2 text-[11px] text-red-600">
            Only {maxQty} {unit} available in stock.
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => canAdd && onAdd(product, weightKg)}
            disabled={!canAdd}
            className="w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <ScaleIcon className="w-4 h-4" />
            Add {weightInUnit > 0 ? `${weightInUnit.toFixed(unit === "g" ? 0 : 3)} ${unit}` : ""} to sale
          </button>
          <button
            onClick={() => onAddManually(product)}
            className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            Enter weight manually instead
          </button>
        </div>
      </div>
    </div>
  );
}
