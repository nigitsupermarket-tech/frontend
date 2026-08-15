"use client";
// frontend/src/components/customer/price-lock.tsx
//
// Drop-in replacement for a price display when the admin's "Hide Prices"
// setting is on and the visitor isn't signed in yet (see
// hooks/usePriceVisibility.ts). Links straight to login, with register in
// the copy so it's clear either path unlocks pricing.

import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceLockProps {
  className?: string;
  /** Use a shorter label in tight spaces like product cards. */
  compact?: boolean;
}

export function PriceLock({ className, compact }: PriceLockProps) {
  return (
    <Link
      href="/login"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 hover:underline font-medium",
        compact ? "text-xs" : "text-sm",
        className,
      )}
    >
      <Lock className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {compact ? "Sign in for price" : "Sign in or register to see price"}
    </Link>
  );
}
