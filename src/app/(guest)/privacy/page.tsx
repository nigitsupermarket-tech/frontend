"use client";

import { useSettings } from "@/hooks/useSettings";
import { formatDate } from "@/lib/utils";

// ✅ FIX: Removed `if (isLoading) return <PageLoader />`.
// See terms/page.tsx for the full explanation.

const DEFAULT_PRIVACY_CONTENT = `
<h2>Introduction</h2>
<p>Nigittriple Industry ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or make a purchase from us.</p>

<h2>Information We Collect</h2>
<h3>Personal Information</h3>
<p>We collect information that you provide directly to us, including:</p>
<ul>
  <li>Name and contact information (email address, phone number, shipping address)</li>
  <li>Payment information (processed securely through our payment providers)</li>
  <li>Account credentials (username and password)</li>
  <li>Purchase history and preferences</li>
</ul>

<h3>Automatically Collected Information</h3>
<p>When you visit our website, we automatically collect certain information about your device, including:</p>
<ul>
  <li>Browser type and version</li>
  <li>IP address</li>
  <li>Time zone setting</li>
  <li>Operating system</li>
  <li>Browsing behavior and patterns</li>
</ul>

<h2>How We Use Your Information</h2>
<p>We use the information we collect to:</p>
<ul>
  <li>Process and fulfill your orders</li>
  <li>Communicate with you about your orders and our services</li>
  <li>Improve our website and customer experience</li>
  <li>Send you marketing communications (with your consent)</li>
  <li>Prevent fraud and maintain security</li>
  <li>Comply with legal obligations</li>
</ul>

<h2>Information Sharing</h2>
<p>We do not sell your personal information. We may share your information with:</p>
<ul>
  <li>Service providers who assist in our operations (shipping, payment processing, email services)</li>
  <li>Law enforcement when required by law</li>
  <li>Business partners with your consent</li>
</ul>

<h2>Data Security</h2>
<p>We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet is 100% secure.</p>

<h2>Your Rights</h2>
<p>You have the right to:</p>
<ul>
  <li>Access your personal information</li>
  <li>Correct inaccurate data</li>
  <li>Request deletion of your data</li>
  <li>Object to processing of your data</li>
  <li>Withdraw consent at any time</li>
</ul>

<h2>Cookies</h2>
<p>We use cookies and similar tracking technologies to enhance your browsing experience. You can control cookies through your browser settings.</p>

<h2>Children's Privacy</h2>
<p>Our services are not directed to individuals under 18 years of age. We do not knowingly collect personal information from children.</p>

<h2>Changes to This Policy</h2>
<p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.</p>

<h2>Contact Us</h2>
<p>If you have questions about this Privacy Policy, please contact us at:</p>
<p>Email: privacy@Nigittriple Industry.com<br>Phone: +234 XXX XXX XXXX<br>Address: Port Harcourt, Rivers State, Nigeria</p>
`;

export default function PrivacyPage() {
  const { settings } = useSettings();

  const content = settings.privacyContent || DEFAULT_PRIVACY_CONTENT;
  const title = settings.privacyTitle || "Privacy Policy";
  const lastUpdated = settings.privacyLastUpdated;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-brand-700 to-brand-600 text-white py-16">
        <div className="container max-w-4xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            {title}
          </h1>
          {lastUpdated && (
            <p className="text-brand-100">
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
