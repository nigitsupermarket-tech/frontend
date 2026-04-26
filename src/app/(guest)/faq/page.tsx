"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_CATEGORIES: { label: string; items: FAQItem[] }[] = [
  {
    label: "Orders & Delivery",
    items: [
      { q: "How do I place an order?", a: "Browse our catalogue, add products to your cart, and proceed to checkout. You can pay by card via Paystack, bank transfer, or cash on delivery. You'll receive an order confirmation by email once your order is placed." },
      { q: "What are your delivery areas?", a: "We currently deliver across Port Harcourt and surrounding areas within Rivers State, including GRA, Rumuola, Trans-Amadi, Diobu, Rumuokoro, Eliozu, Woji, Peter Odili Road, and many more. Enter your address at checkout to confirm delivery availability." },
      { q: "How long does delivery take?", a: "Orders placed before 2PM on working days are eligible for same-day delivery within Port Harcourt. Orders placed after 2PM are delivered the next working day. We'll send you a notification when your order is on its way." },
      { q: "Can I track my order?", a: "Yes. Once your order is dispatched, you'll receive a tracking link via SMS and email. You can also view your order status in real time from your account dashboard under 'My Orders'." },
      { q: "What if I'm not available to receive my order?", a: "Our delivery team will call ahead before arriving. If you're unavailable, you can reschedule or designate someone else to receive the order. We'll make up to two delivery attempts before returning the order." },
      { q: "Is there a minimum order amount?", a: "There is no minimum order amount for individual customers. Business and bulk orders may have minimum requirements — contact us for details." },
    ],
  },
  {
    label: "Products & Availability",
    items: [
      { q: "Are all your products genuine?", a: "Absolutely. We source every product directly from authorised distributors and reputable wholesalers. We do not stock counterfeit or sub-standard goods. Our catalogue is regularly audited for authenticity." },
      { q: "What if a product I want is out of stock?", a: "You can use the 'Notify Me' feature on any out-of-stock product page and we'll email you as soon as it's available. You can also contact us and we'll do our best to source it for you." },
      { q: "Do you sell products by the carton?", a: "Yes. Many products are available in carton quantities, which is indicated on each product listing. Buying by the carton often gives you a better unit price." },
      { q: "Can I request a product that's not in your catalogue?", a: "Yes! We're always expanding our range. Send us a product request via the Contact page or WhatsApp, and we'll work to source it for you." },
    ],
  },
  {
    label: "Payment & Pricing",
    items: [
      { q: "What payment methods do you accept?", a: "We accept payment by debit/credit card via Paystack, bank transfer, and cash on delivery (available in selected areas within Port Harcourt). All card payments are processed securely with 256-bit encryption." },
      { q: "Are your prices inclusive of delivery?", a: "Prices shown are for the products only. Delivery fees are calculated at checkout based on your location and order size. We aim to keep delivery fees as low as possible, and many orders qualify for free delivery above a certain threshold." },
      { q: "Do you offer discounts for bulk orders?", a: "Yes. Business accounts and bulk buyers benefit from preferential pricing. Contact our business team to discuss volume discounts and account setup." },
      { q: "Can I use a discount code?", a: "Yes. If you have a promo code or voucher, enter it at checkout in the 'Discount Code' field. Codes cannot be combined and are subject to the terms of each promotion." },
    ],
  },
  {
    label: "Returns & Refunds",
    items: [
      { q: "What is your returns policy?", a: "If you receive a damaged, incorrect, or expired product, contact us within 24 hours of delivery with a photo of the item. We will arrange a replacement or refund — no questions asked. We take product quality seriously." },
      { q: "How are refunds processed?", a: "Approved refunds are processed within 3–5 working days back to your original payment method. For cash-on-delivery orders, refunds are made via bank transfer." },
      { q: "Can I cancel my order?", a: "Orders can be cancelled within 1 hour of placement by contacting our support team. Once your order has been dispatched, cancellations are not possible, but you can refuse delivery and we'll arrange a refund." },
    ],
  },
  {
    label: "Account & Privacy",
    items: [
      { q: "Do I need an account to order?", a: "You can browse our catalogue without an account. However, creating an account allows you to track orders, save addresses, view your order history, and enjoy a faster checkout experience." },
      { q: "How do I verify my email address?", a: "After registration, we send a verification link to your email. Click the link to activate your account. If you didn't receive it, check your spam folder or use the 'Resend Verification' option on the verification page." },
      { q: "Is my personal data safe?", a: "Yes. We handle your data in accordance with Nigerian data protection regulations. We never sell your personal information to third parties. Read our full Privacy Policy for details." },
      { q: "How do I delete my account?", a: "You can request account deletion by emailing us or using the option in your account settings. We'll process the request within 7 working days." },
    ],
  },
];

function AccordionItem({ q, a }: FAQItem) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-4 py-5 text-left hover:text-green-700 transition-colors"
      >
        <span className="font-semibold text-gray-900 text-sm leading-relaxed">{q}</span>
        <ChevronDown className={cn("w-5 h-5 text-gray-400 shrink-0 mt-0.5 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="pb-5 pr-8">
          <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="min-h-screen">
      <section className="bg-green-800 text-white py-16">
        <div className="container text-center max-w-3xl">
          <p className="text-green-300 text-sm font-semibold uppercase tracking-widest mb-2">Got Questions?</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-green-100 text-lg">Everything you need to know about ordering, delivery, payments and more.</p>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="container max-w-4xl">
          {/* Category tabs */}
          <div className="flex overflow-x-auto gap-2 mb-8 pb-1" style={{ scrollbarWidth: "none" }}>
            {FAQ_CATEGORIES.map(({ label }, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap",
                  activeTab === i
                    ? "bg-green-700 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-green-300 hover:text-green-700",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* FAQ list */}
          <div className="bg-white rounded-2xl border border-gray-100 px-6 divide-y divide-gray-100">
            {FAQ_CATEGORIES[activeTab].items.map((item, i) => (
              <AccordionItem key={i} {...item} />
            ))}
          </div>

          {/* Still have questions */}
          <div className="mt-10 bg-green-50 border border-green-100 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Still have a question?</h3>
            <p className="text-gray-500 text-sm mb-5">Our support team is available Monday–Saturday, 8AM–6PM. We typically respond within 1 hour.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/contact" className="px-6 py-2.5 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition-colors text-sm">
                Contact Us
              </Link>
              <a href="https://wa.me/" className="px-6 py-2.5 bg-[#25D366] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm">
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
