"use client";

import { useSettings } from "@/hooks/useSettings";
import { formatDate } from "@/lib/utils";

// ✅ FIX: Removed `if (isLoading) return <PageLoader />`.
// That guard blocked the entire page render on every client-side navigation.
// These pages have hardcoded defaults so they render correctly even before
// settings are fetched. The settings just override the defaults when ready.

const DEFAULT_TERMS_CONTENT = `
<h2>Agreement to Terms</h2>
<p>By accessing and using Nigittriple Industry, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>

<h2>Use of Our Service</h2>
<h3>Eligibility</h3>
<p>You must be at least 18 years old to use our services. By using Nigittriple Industry, you represent that you meet this age requirement.</p>

<h3>Account Responsibilities</h3>
<p>When you create an account, you agree to:</p>
<ul>
  <li>Provide accurate and complete information</li>
  <li>Maintain the security of your account credentials</li>
  <li>Promptly update any information that becomes inaccurate</li>
  <li>Accept responsibility for all activities under your account</li>
</ul>

<h2>Products and Services</h2>
<h3>Product Information</h3>
<p>We strive to provide accurate product descriptions and pricing. However, we reserve the right to:</p>
<ul>
  <li>Correct any errors or inaccuracies</li>
  <li>Update product information</li>
  <li>Modify or discontinue products without prior notice</li>
</ul>

<h3>Pricing</h3>
<p>All prices are in Nigerian Naira (₦) and are subject to change without notice. We are not responsible for pricing errors.</p>

<h2>Orders and Payment</h2>
<h3>Order Acceptance</h3>
<p>All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order for any reason, including:</p>
<ul>
  <li>Product unavailability</li>
  <li>Pricing errors</li>
  <li>Suspected fraud</li>
  <li>Violations of these terms</li>
</ul>

<h3>Payment Terms</h3>
<p>Payment must be received before order processing. We accept Paystack, bank transfers, and cash on delivery as specified during checkout.</p>

<h2>Shipping and Delivery</h2>
<p>Shipping times and costs vary by location. We are not responsible for delays caused by:</p>
<ul>
  <li>Customs processing</li>
  <li>Weather conditions</li>
  <li>Carrier delays</li>
  <li>Force majeure events</li>
</ul>

<h2>Returns and Refunds</h2>
<h3>Return Policy</h3>
<p>You may return products within 14 days of delivery, provided they are:</p>
<ul>
  <li>Unused and in original condition</li>
  <li>In original packaging</li>
  <li>Accompanied by proof of purchase</li>
</ul>

<h3>Refund Process</h3>
<p>Approved refunds will be processed within 7-14 business days to the original payment method.</p>

<h2>Intellectual Property</h2>
<p>All content on Nigittriple Industry, including text, graphics, logos, and images, is the property of Nigittriple Industry and protected by copyright laws. You may not:</p>
<ul>
  <li>Reproduce or distribute our content without permission</li>
  <li>Use our trademarks or branding</li>
  <li>Modify or create derivative works</li>
</ul>

<h2>User Conduct</h2>
<p>You agree not to:</p>
<ul>
  <li>Violate any laws or regulations</li>
  <li>Impersonate others or provide false information</li>
  <li>Interfere with the operation of our website</li>
  <li>Attempt to gain unauthorized access</li>
  <li>Transmit harmful code or malware</li>
  <li>Engage in fraudulent activities</li>
</ul>

<h2>Limitation of Liability</h2>
<p>Nigittriple Industry shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.</p>

<h2>Indemnification</h2>
<p>You agree to indemnify and hold Nigittriple Industry harmless from any claims, damages, or expenses arising from your violation of these terms or your use of our services.</p>

<h2>Modifications to Terms</h2>
<p>We reserve the right to modify these terms at any time. Continued use of our services after changes constitutes acceptance of the modified terms.</p>

<h2>Governing Law</h2>
<p>These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved in Nigerian courts.</p>

<h2>Contact Information</h2>
<p>For questions about these Terms of Service, contact us at:</p>
<p>Email: legal@Nigittriple Industry.com<br>Phone: +234 XXX XXX XXXX<br>Address: Port Harcourt, Rivers State, Nigeria</p>
`;

export default function TermsPage() {
  const { settings } = useSettings();

  const content = settings.termsContent || DEFAULT_TERMS_CONTENT;
  const title = settings.termsTitle || "Terms of Service";
  const lastUpdated = settings.termsLastUpdated;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16">
        <div className="container max-w-4xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            {title}
          </h1>
          {lastUpdated && (
            <p className="text-gray-300">
              Last updated: {formatDate(lastUpdated)}
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
            <div
              className="prose prose-lg max-w-none
                [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:first:mt-0
                [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-6 [&_h3]:mb-3
                [&_p]:text-gray-600 [&_p]:leading-relaxed [&_p]:mb-4
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:text-gray-600
                [&_li]:mb-2
                [&_a]:text-brand-600 [&_a]:underline [&_a]:hover:text-brand-700"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
