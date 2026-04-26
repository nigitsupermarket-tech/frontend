"use client";
// frontend/src/app/(guest)/contact/page.tsx

import { useState, FormEvent } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import { apiPost, getApiError } from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/store/uiStore";
import Link from "next/link";

const HEARD_OPTIONS = [
  "Google / Search Engine",
  "Instagram",
  "Facebook",
  "Twitter / X",
  "WhatsApp",
  "Friend or Family",
  "Flyer / Poster",
  "Radio / TV",
  "Marketplace (Jumia, Konga etc.)",
  "Other",
];

const CONTACT_METHODS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone Call" },
  { value: "whatsapp", label: "WhatsApp" },
];

const TIME_OPTIONS = [
  { value: "morning", label: "Morning (8am – 12pm)" },
  { value: "afternoon", label: "Afternoon (12pm – 4pm)" },
  { value: "evening", label: "Evening (4pm – 7pm)" },
  { value: "anytime", label: "Anytime" },
];

const selCls =
  "w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 bg-white appearance-none text-sm text-gray-800";

export default function ContactPage() {
  const { settings } = useSettings();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    heardAboutUs: "",
    preferredContact: "",
    preferredTime: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await apiPost("/contact/send", form);
      setSent(true);
      toast("Message sent! We'll get back to you shortly.", "success");
      setForm({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        heardAboutUs: "",
        preferredContact: "",
        preferredTime: "",
      });
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
          <p className="text-lg text-brand-100">
            {settings.contactSubtitle ||
              "We're here to help — reach out for orders, enquiries or feedback"}
          </p>
        </div>
      </section>

      <div className="container py-16 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left: Contact info */}
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

            {settings.contactHours &&
              Object.keys(settings.contactHours).length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-brand-600" /> Business Hours
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

            {settings.contactMap && (
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <iframe
                  src={settings.contactMap}
                  width="100%"
                  height="280"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            )}
          </div>

          {/* Right: Form */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            {sent ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Message Sent!
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  Thank you for reaching out. We'll get back to you at your
                  preferred time.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="px-6 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Send us a Message
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name + Email */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="Your name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        placeholder="you@email.com"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Phone + Subject */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          setForm({ ...form, phone: e.target.value })
                        }
                        placeholder="+234..."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject *
                      </label>
                      <input
                        required
                        value={form.subject}
                        onChange={(e) =>
                          setForm({ ...form, subject: e.target.value })
                        }
                        placeholder="How can we help?"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                      placeholder="Tell us what you need…"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 resize-none text-sm"
                    />
                  </div>

                  {/* ── Extra fields ── */}
                  <div className="border-t border-gray-100 pt-4 space-y-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Help us serve you better
                    </p>

                    {/* Where did you hear about us */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Where did you hear about us?
                      </label>
                      <select
                        value={form.heardAboutUs}
                        onChange={(e) =>
                          setForm({ ...form, heardAboutUs: e.target.value })
                        }
                        className={selCls}
                      >
                        <option value="">Select an option</option>
                        {HEARD_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-[38px] w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Preferred contact method */}
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          How should we reach you?
                        </label>
                        <select
                          value={form.preferredContact}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              preferredContact: e.target.value,
                            })
                          }
                          className={selCls}
                        >
                          <option value="">No preference</option>
                          {CONTACT_METHODS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-[38px] w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>

                      {/* Preferred time */}
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Best time to reach you?
                        </label>
                        <select
                          value={form.preferredTime}
                          onChange={(e) =>
                            setForm({ ...form, preferredTime: e.target.value })
                          }
                          className={selCls}
                        >
                          <option value="">No preference</option>
                          {TIME_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-[38px] w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full py-3.5 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
                  >
                    {sending ? "Sending…" : "Send Message"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
