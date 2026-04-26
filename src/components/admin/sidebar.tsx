"use client";
// frontend/src/components/admin/sidebar.tsx
// Role-aware sidebar: ADMIN sees everything, STAFF sees POS+products+orders,
// SALES sees POS, orders, customers, marketing, analytics (sales-focused)

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart3, Settings,
  Mail, Truck, Star, BookOpen, ChevronDown, ChevronRight, ShoppingBag,
  X, Monitor, Tag, Store, TrendingUp, Activity,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/admin/sidebar-context";
import { useAuthStore } from "@/store/authStore";

interface NavItem {
  label: string; href?: string; icon: React.ElementType;
  badge?: string; children?: { label: string; href: string }[];
  roles?: string[]; // if undefined = all roles can see it
}

// Full nav definition — each item has optional `roles` to restrict visibility
const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },

  {
    label: "Point of Sale", icon: Monitor,
    children: [
      { label: "🖥️ Open POS", href: "/admin/pos" },
      { label: "POS Orders", href: "/admin/pos/orders" },
      { label: "POS Sessions", href: "/admin/pos/sessions" },
    ],
  },

  {
    label: "Products", icon: Package,
    roles: ["ADMIN", "STAFF"],
    children: [
      { label: "All Products", href: "/admin/products" },
      { label: "Add Product", href: "/admin/products/new" },
      { label: "Categories", href: "/admin/categories" },
      { label: "Brands", href: "/admin/brands" },
      { label: "Inventory", href: "/admin/inventory" },
      { label: "Promotions", href: "/admin/promotions" },
    ],
  },

  // SALES can see promotions directly
  {
    label: "Promotions", href: "/admin/promotions", icon: Tag,
    roles: ["SALES"],
  },

  {
    label: "Online Orders", icon: ShoppingCart,
    children: [{ label: "All Orders", href: "/admin/orders" }],
  },

  {
    label: "Customers", icon: Users,
    children: [
      { label: "All Customers", href: "/admin/customers" },
      { label: "User Management", href: "/admin/users", /* admin only shown via roles */ },
    ],
  },

  { label: "Reviews", href: "/admin/reviews", icon: Star, roles: ["ADMIN", "STAFF"] },

  {
    label: "Marketing", icon: Mail,
    children: [
      { label: "Email Campaigns", href: "/admin/marketing/emails" },
      { label: "SMS Campaigns", href: "/admin/marketing/sms" },
      { label: "Abandoned Carts", href: "/admin/marketing/abandoned-carts" },
      { label: "Discounts & Coupons", href: "/admin/discounts" },
    ],
  },

  {
    label: "Shipping", icon: Truck,
    roles: ["ADMIN", "STAFF"],
    children: [
      { label: "Shipping Zones", href: "/admin/shipping/zones" },
      { label: "Shipping Methods", href: "/admin/shipping/methods" },
    ],
  },

  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, roles: ["ADMIN"] },
  { label: "Activity Log", href: "/admin/activities", icon: Activity, roles: ["ADMIN"] },
  { label: "Sales Analytics", href: "/admin/analytics", icon: TrendingUp, roles: ["SALES"] },

  {
    label: "Blog", icon: BookOpen,
    roles: ["ADMIN", "STAFF"],
    children: [
      { label: "All Posts", href: "/admin/blog" },
      { label: "New Post", href: "/admin/blog/new" },
    ],
  },

  {
    label: "Settings", icon: Settings,
    roles: ["ADMIN"],
    children: [
      { label: "General", href: "/admin/settings" },
      { label: "Pages", href: "/admin/settings/pages" },
      { label: "Site Identity", href: "/admin/settings/site" },
      { label: "Email Config", href: "/admin/settings/email" },
      { label: "SMS Config", href: "/admin/settings/sms" },
    ],
  },
];

function NavItemComponent({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = item.href
    ? pathname === item.href
    : item.children?.some((c) => pathname.startsWith(c.href));
  const [expanded, setExpanded] = useState(isActive || false);
  const isPOS = item.label === "Point of Sale";

  if (item.children) {
    return (
      <div>
        <button onClick={() => setExpanded(!expanded)}
          className={cn("w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            isPOS ? isActive ? "bg-amber-100 text-amber-800" : "text-amber-700 hover:bg-amber-50"
              : isActive ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          )}
        >
          <div className="flex items-center gap-3"><item.icon className="w-4 h-4 shrink-0" />{item.label}</div>
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {expanded && (
          <div className="mt-1 ml-7 space-y-0.5">
            {item.children.map(({ label, href }) => (
              <Link key={href} href={href} onClick={onNavigate}
                className={cn("block px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname === href || pathname.startsWith(href + "/")
                    ? "bg-green-50 text-green-700 font-medium"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                )}
              >{label}</Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={item.href!} onClick={onNavigate}
      className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        isActive ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <item.icon className="w-4 h-4 shrink-0" />{item.label}
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuthStore();
  const role = user?.role || "STAFF";

  // Filter nav items by role
  const visibleItems = ALL_NAV_ITEMS.filter((item) =>
    !item.roles || item.roles.includes(role)
  );

  // For SALES: also filter "User Management" child from Customers
  const processedItems = visibleItems.map((item) => {
    if (item.label === "Customers" && role === "SALES") {
      return { ...item, children: item.children?.filter((c) => c.label !== "User Management") };
    }
    return item;
  });

  return (
    <>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Role badge */}
        {role === "SALES" && (
          <div className="px-3 py-1.5 mb-2 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg">
            Sales Manager
          </div>
        )}
        {role === "STAFF" && (
          <div className="px-3 py-1.5 mb-2 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg">
            Staff
          </div>
        )}
        {processedItems.map((item) => (
          <NavItemComponent key={item.label} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <Link href="/" onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-green-600 rounded-lg hover:bg-gray-50 transition-colors"
        >← Back to store</Link>
      </div>
    </>
  );
}

function Logo() {
  return (
    <div className="p-5 border-b border-gray-100">
      <Link href="/admin/dashboard" className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
          <ShoppingBag className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">NigitTriple</p>
          <p className="text-[11px] text-gray-400">Admin Panel</p>
        </div>
      </Link>
    </div>
  );
}

export function AdminSidebar() {
  const { isOpen, close } = useSidebar();
  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 shrink-0">
        <Logo /><SidebarContent />
      </aside>
      <div className={cn("fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden", isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")} onClick={close} />
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-white border-r border-gray-100 transition-transform duration-300 ease-in-out lg:hidden", isOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <Link href="/admin/dashboard" onClick={close} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-white" /></div>
            <div><p className="text-sm font-bold text-gray-900">NigitTriple</p><p className="text-[11px] text-gray-400">Admin Panel</p></div>
          </Link>
          <button onClick={close} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <SidebarContent onNavigate={close} />
      </aside>
    </>
  );
}
