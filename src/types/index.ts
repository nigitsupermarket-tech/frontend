// NOTE: cartStore logic does NOT belong here.
// This file is types only. Keep cartStore in src/store/cartStore.ts

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "CUSTOMER" | "STAFF" | "ADMIN" | "SALES";
  image?: string;
  emailVerified: boolean;
  customerSegment?: string;
  totalSpent: number;
  orderCount: number;
  lastOrderDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

// ============================================
// ADDRESS TYPES
// ============================================

export interface Address {
  id: string;
  userId: string;
  label?: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PRODUCT TYPES
// ============================================

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  sku: string;
  barcode?: string;

  // Pricing
  price: number;
  comparePrice?: number;
  costPrice?: number;

  // Media
  images: string[];
  videos?: string[];

  // Classification
  categoryId?: string;
  category?: Category;
  brandId?: string;
  brand?: Brand;
  tags: string[];

  // Inventory
  stockQuantity: number;
  lowStockThreshold: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  allowBackorder: boolean;
  trackInventory: boolean;

  // Status
  status: "ACTIVE" | "DRAFT" | "OUT_OF_STOCK" | "DISCONTINUED";
  isFeatured: boolean;
  isNewArrival: boolean;

  // Dimensions
  weight?: number;
  length?: number;
  width?: number;
  height?: number;

  // Analytics
  averageRating: number;
  reviewCount: number;
  salesCount: number;
  viewCount: number;

  // SEO
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;

  // ── Grocery fields ──
  netWeight?: string; // e.g. "500g", "1L"
  packageSize?: string; // e.g. "Pack of 6"
  unitsPerCarton?: number; // shown as "12 units / carton"
  origin?: string;
  ingredients?: string;
  allergens?: string[];
  storageInstructions?: string;
  shelfLifeDays?: number;
  servingSize?: string;
  servingsPerPack?: string;
  naifdaNumber?: string;
  requiresRefrigeration?: boolean;
  requiresFreezing?: boolean;
  isOrganic?: boolean;
  isHalal?: boolean;
  isKosher?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
    sugar?: number;
  };
  isOnPromotion?: boolean;
  promotionEndsAt?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string; // Regular image (JPG/PNG/WebP)
  svgIcon?: string; // SVG icon URL — colour-changes on hover via CSS filter
  icon?: string; // Emoji icon for sidebar display e.g. "🥦"
  parentId?: string;
  parent?: Category;
  children?: Category[];
  isActive: boolean;
  productCount?: number;
  _count?: {
    products: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  country?: string;
  isActive: boolean;
  productCount?: number;
  _count?: {
    products: number;
  };
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CART TYPES
// ============================================

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface Cart {
  id: string;
  userId?: string;
  guestId?: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ORDER TYPES
// ============================================

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
}

export interface OrderShippingAddress {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  user?: User;
  status: OrderStatus;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  paymentMethod: string;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  tax: number;
  total: number;
  items: OrderItem[];
  shippingAddress?: OrderShippingAddress;
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  paymentReference?: string;
  statusHistory?: OrderStatusHistory[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// DISCOUNT TYPES
// ============================================

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";

export interface Discount {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: DiscountType;
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  perUserLimit?: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// SHIPPING TYPES
// ============================================

export interface ShippingZone {
  id: string;
  name: string;
  description?: string;
  states: string[];
  isActive: boolean;
  rates?: ShippingRate[];
  createdAt: string;
  updatedAt: string;
}

export interface ShippingRate {
  id: string;
  zoneId: string;
  name: string;
  cost: number;
  minOrderAmount?: number;
  freeAbove?: number;
  estimatedDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// REVIEW TYPES
// ============================================

export interface Review {
  id: string;
  productId: string;
  product?: Product;
  userId: string;
  user?: Pick<User, "id" | "name" | "image">;
  rating: number;
  comment?: string;
  images?: string[];
  isVerified: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// SITE SETTINGS TYPES
// ============================================

export interface SiteSettings {
  id?: string;
  siteName: string;
  siteDescription?: string;
  siteKeywords?: string;
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;

  // Contact
  email?: string;
  phone?: string;
  address?: string;
  whatsapp?: string;

  // Social
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;

  // Business
  currency?: string;
  currencySymbol?: string;
  taxRate?: number;

  // SEO
  metaTitle?: string;
  metaDescription?: string;
  metaImage?: string;

  // Header
  headerBanner?: string;
  showHeaderBanner?: boolean;

  // Pricing visibility
  hidePricing?: boolean;

  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// BLOG TYPES
// ============================================

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  categoryId?: string;
  category?: BlogCategory;
  authorId?: string;
  author?: User;
  tags: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  viewCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// DASHBOARD & ANALYTICS TYPES
// ============================================

export interface DashboardStats {
  orders: {
    total: number;
    today: number;
    thisMonth?: number;
    pending?: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth?: number;
    growth?: number;
    total?: number;
  };
  customers: {
    total: number;
    newThisMonth: number;
  };
  inventory: {
    total: number;
    lowStock: number;
    outOfStock?: number;
  };
  pos?: {
    ordersToday?: number;
    salesToday?: number;
  };
  promotions?: {
    active?: number;
  };
}

export interface RevenueChartPoint {
  date: string;
  revenue: number;
}

// ============================================
// PAGINATION TYPES
// ============================================

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}

// ============================================
// FILTER & SEARCH TYPES
// ============================================

export interface ProductFilters {
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  search?: string;
  sort?: "price-asc" | "price-desc" | "name-asc" | "name-desc" | "newest";
  page?: number;
  limit?: number;
}

// ============================================
// UTILITY TYPES
// ============================================

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
export type ProductStatus = "ACTIVE" | "INACTIVE" | "DRAFT";
export type UserRole = "CUSTOMER" | "STAFF" | "ADMIN";
export type BlogStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
