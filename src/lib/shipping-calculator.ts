//frontend/src/lib/shipping-calculator.ts
/**
 * Client-Side Shipping Calculator
 * Use this utility to calculate shipping costs on the frontend
 */

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT - Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

export type NigerianState = (typeof NIGERIAN_STATES)[number];

export interface ShippingRate {
  id: string;
  name: string;
  type: "FLAT_RATE" | "WEIGHT_BASED" | "LOCATION_BASED" | "FREE";
  cost: number;
  estimatedDays: number;
  minWeight?: number | null;
  maxWeight?: number | null;
  minOrderValue?: number | null;
  freeShippingOver?: number | null;
}

export interface ShippingZone {
  id: string;
  name: string;
  states: string[];
  rates: ShippingRate[];
}

export interface ShippingCalculation {
  zone: string;
  rates: Array<{
    id: string;
    name: string;
    type: string;
    cost: number;
    estimatedDays: number;
    savings?: number; // Amount saved from original price
    isFree?: boolean;
    isFastest?: boolean;
    isCheapest?: boolean;
    isRecommended?: boolean;
  }>;
  cheapestRate?: {
    id: string;
    name: string;
    cost: number;
    estimatedDays: number;
  };
  fastestRate?: {
    id: string;
    name: string;
    cost: number;
    estimatedDays: number;
  };
  recommendedRate?: {
    id: string;
    name: string;
    cost: number;
    estimatedDays: number;
  };
}

/**
 * Calculate shipping rates for a given state, order amount, and weight
 * @param state - Nigerian state
 * @param orderAmount - Total order amount in Naira
 * @param weight - Total weight in kilograms
 * @param zones - Array of shipping zones (fetch from API)
 * @returns Calculated shipping options
 */
export function calculateShipping(
  state: string,
  orderAmount: number,
  weight: number,
  zones: ShippingZone[],
): ShippingCalculation | null {
  // Find the zone containing this state
  const zone = zones.find((z) =>
    z.states.some((s) => s.toLowerCase() === state.toLowerCase()),
  );

  if (!zone) {
    return null;
  }

  // Filter applicable rates
  const applicableRates = zone.rates
    .filter((rate) => {
      // Check minimum order value
      if (rate.minOrderValue && orderAmount < rate.minOrderValue) {
        return false;
      }

      // Check weight constraints
      if (
        rate.minWeight !== null &&
        rate.minWeight !== undefined &&
        weight < rate.minWeight
      ) {
        return false;
      }
      if (
        rate.maxWeight !== null &&
        rate.maxWeight !== undefined &&
        weight > rate.maxWeight
      ) {
        return false;
      }

      return true;
    })
    .map((rate) => {
      // Calculate actual cost (free shipping if threshold met)
      const actualCost =
        rate.freeShippingOver && orderAmount >= rate.freeShippingOver
          ? 0
          : rate.cost;

      // Calculate savings
      const standardRate = zone.rates.find(
        (r) =>
          r.name.includes("Standard Delivery") &&
          r.minWeight !== null &&
          r.minWeight !== undefined &&
          r.maxWeight !== null &&
          r.maxWeight !== undefined &&
          weight >= r.minWeight &&
          weight <= r.maxWeight,
      );
      const savings =
        standardRate && actualCost < standardRate.cost
          ? standardRate.cost - actualCost
          : undefined;

      return {
        id: rate.id,
        name: rate.name,
        type: rate.type,
        cost: actualCost,
        estimatedDays: rate.estimatedDays,
        savings,
        isFree: actualCost === 0,
        isFastest: false,
        isCheapest: false,
        isRecommended: false,
      };
    })
    .sort((a, b) => a.cost - b.cost); // Sort by cost

  if (applicableRates.length === 0) {
    return null;
  }

  // Find cheapest rate
  const cheapestRate = applicableRates.reduce((prev, curr) =>
    curr.cost < prev.cost ? curr : prev,
  );

  // Find fastest rate
  const fastestRate = applicableRates.reduce((prev, curr) =>
    curr.estimatedDays < prev.estimatedDays ? curr : prev,
  );

  // Find recommended rate (best balance of cost and speed)
  // Scoring: 70% cost weight, 30% speed weight
  const ratesWithScore = applicableRates.map((rate) => {
    const maxCost = Math.max(...applicableRates.map((r) => r.cost));
    const maxDays = Math.max(...applicableRates.map((r) => r.estimatedDays));

    const costScore = maxCost > 0 ? (1 - rate.cost / maxCost) * 0.7 : 0.7;
    const speedScore =
      maxDays > 0 ? (1 - rate.estimatedDays / maxDays) * 0.3 : 0.3;

    return {
      ...rate,
      score: costScore + speedScore,
    };
  });

  const recommendedRate = ratesWithScore.reduce((prev, curr) =>
    curr.score > prev.score ? curr : prev,
  );

  // Mark special rates
  applicableRates.forEach((rate) => {
    rate.isCheapest = rate.id === cheapestRate.id;
    rate.isFastest = rate.id === fastestRate.id;
    rate.isRecommended = rate.id === recommendedRate.id;
  });

  return {
    zone: zone.name,
    rates: applicableRates,
    cheapestRate: {
      id: cheapestRate.id,
      name: cheapestRate.name,
      cost: cheapestRate.cost,
      estimatedDays: cheapestRate.estimatedDays,
    },
    fastestRate: {
      id: fastestRate.id,
      name: fastestRate.name,
      cost: fastestRate.cost,
      estimatedDays: fastestRate.estimatedDays,
    },
    recommendedRate: {
      id: recommendedRate.id,
      name: recommendedRate.name,
      cost: recommendedRate.cost,
      estimatedDays: recommendedRate.estimatedDays,
    },
  };
}

/**
 * Get estimated delivery date based on estimated days
 * @param estimatedDays - Number of estimated delivery days
 * @returns Estimated delivery date
 */
export function getEstimatedDeliveryDate(estimatedDays: number): Date {
  const today = new Date();
  const deliveryDate = new Date(today);

  // Add business days (skip weekends)
  let daysAdded = 0;
  while (daysAdded < estimatedDays) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
    // Skip Sundays (0) and Saturdays (6)
    if (deliveryDate.getDay() !== 0 && deliveryDate.getDay() !== 6) {
      daysAdded++;
    }
  }

  return deliveryDate;
}

/**
 * Format delivery date range
 * @param estimatedDays - Number of estimated delivery days
 * @returns Formatted date range string (e.g., "Feb 20 - Feb 22")
 */
export function formatDeliveryDateRange(estimatedDays: number): string {
  const startDate = getEstimatedDeliveryDate(Math.max(1, estimatedDays - 1));
  const endDate = getEstimatedDeliveryDate(estimatedDays + 1);

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const start = startDate.toLocaleDateString("en-US", options);
  const end = endDate.toLocaleDateString("en-US", options);

  return `${start} - ${end}`;
}

/**
 * Format currency (Naira)
 * @param amount - Amount in Naira
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

/**
 * Calculate total cart weight from items
 * @param items - Array of cart items with weight property
 * @returns Total weight in kg
 */
export function calculateTotalWeight(
  items: Array<{ weight?: number; quantity: number }>,
): number {
  return items.reduce((total, item) => {
    const itemWeight = item.weight || 0;
    return total + itemWeight * item.quantity;
  }, 0);
}

/**
 * Get shipping zone for a state
 * @param state - Nigerian state
 * @param zones - Array of shipping zones
 * @returns Shipping zone or null
 */
export function getShippingZone(
  state: string,
  zones: ShippingZone[],
): ShippingZone | null {
  return (
    zones.find((z) =>
      z.states.some((s) => s.toLowerCase() === state.toLowerCase()),
    ) || null
  );
}

/**
 * Check if free shipping is available for order
 * @param orderAmount - Order total
 * @param state - Nigerian state
 * @param zones - Array of shipping zones
 * @returns True if free shipping is available
 */
export function isFreeShippingAvailable(
  orderAmount: number,
  state: string,
  zones: ShippingZone[],
): boolean {
  const zone = getShippingZone(state, zones);
  if (!zone) return false;

  return zone.rates.some(
    (rate) => rate.freeShippingOver && orderAmount >= rate.freeShippingOver,
  );
}

/**
 * Get amount needed for free shipping
 * @param orderAmount - Current order total
 * @param state - Nigerian state
 * @param zones - Array of shipping zones
 * @returns Amount needed for free shipping, or null if not applicable
 */
export function getAmountNeededForFreeShipping(
  orderAmount: number,
  state: string,
  zones: ShippingZone[],
): number | null {
  const zone = getShippingZone(state, zones);
  if (!zone) return null;

  // Find the lowest free shipping threshold
  const freeShippingThresholds = zone.rates
    .filter(
      (rate) => rate.freeShippingOver && rate.freeShippingOver > orderAmount,
    )
    .map((rate) => rate.freeShippingOver as number)
    .sort((a, b) => a - b);

  if (freeShippingThresholds.length === 0) return null;

  const lowestThreshold = freeShippingThresholds[0];
  return lowestThreshold - orderAmount;
}

// Example usage:
/*
import { calculateShipping, formatCurrency, formatDeliveryDateRange } from './utils/shipping-calculator';

// Fetch zones from API
const zones = await fetch('/api/v1/shipping/zones').then(r => r.json());

// Calculate shipping
const result = calculateShipping('Lagos', 150000, 15, zones.data.zones);

if (result) {
  console.log(`Shipping Zone: ${result.zone}`);
  console.log(`Recommended: ${result.recommendedRate.name} - ${formatCurrency(result.recommendedRate.cost)}`);
  console.log(`Delivery: ${formatDeliveryDateRange(result.recommendedRate.estimatedDays)}`);
  
  result.rates.forEach(rate => {
    if (rate.isRecommended) {
      console.log(`⭐ ${rate.name} - ${formatCurrency(rate.cost)} (${rate.estimatedDays} days)`);
    } else {
      console.log(`   ${rate.name} - ${formatCurrency(rate.cost)} (${rate.estimatedDays} days)`);
    }
    
    if (rate.savings) {
      console.log(`   💰 Save ${formatCurrency(rate.savings)}`);
    }
  });
}
*/
