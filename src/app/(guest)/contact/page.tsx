"use client";

import { useState, FormEvent } from "react";
import { Mail, Phone, MapPin, Clock, MessageSquare } from "lucide-react";
import { apiPost, getApiError } from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/store/uiStore";
import Link from "next/link";

export default function ContactPage() {
  // ✅ Uses shared module-level cache — no extra DB hit
  const { settings } = useSettings();
  const [sending, setSending] = useState(false);
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await apiPost("/contact/send", form);
      toast("Message sent successfully!", "success");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-700 to-brand-600 text-white py-20">
        <div className="container max-w-3xl text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            {settings.contactTitle || "Contact Us"}
          </h1>
          {settings.contactSubtitle && (
            <p className="text-lg text-brand-100">{settings.contactSubtitle}</p>
          )}
          {!settings.contactSubtitle && (
            <p className="text-lg text-brand-100">
              We&apos;re here to help — reach out for orders, inquiries or feedback
            </p>
          )}
        </div>
      </section>

      <div className="container py-16 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Get in Touch
              </h2>
              <div className="space-y-4">
                {settings.contactEmail && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Email</p>
                      <Link
                        href={`mailto:${settings.contactEmail}`}
                        className="text-gray-900 hover:text-brand-600 font-medium"
                      >
                        {settings.contactEmail}
                      </Link>
                    </div>
                  </div>
                )}

                {settings.contactPhone && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Phone</p>
                      <Link
                        href={`tel:${settings.contactPhone}`}
                        className="text-gray-900 hover:text-brand-600 font-medium"
                      >
                        {settings.contactPhone}
                      </Link>
                    </div>
                  </div>
                )}

                {settings.contactWhatsapp && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">WhatsApp</p>
                      <Link
                        href={`https://wa.me/${settings.contactWhatsapp.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        className="text-gray-900 hover:text-green-600 font-medium"
                      >
                        {settings.contactWhatsapp}
                      </Link>
                    </div>
                  </div>
                )}

                {settings.contactAddress && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Address</p>
                      <p className="text-gray-900">{settings.contactAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hours */}
            {settings.contactHours &&
              Object.keys(settings.contactHours).length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-brand-600" />
                    Business Hours
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-6 space-y-2">
                    {Object.entries(settings.contactHours).map(
                      ([day, hours]) => (
                        <div key={day} className="flex justify-between text-sm">
                          <span className="text-gray-600 capitalize">
                            {day}
                          </span>
                          <span className="text-gray-900 font-medium">
                            {hours as string}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

            {/* Map */}
            {settings.contactMap && (
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <iframe
                  src={settings.contactMap}
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            )}
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Send us a Message
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
