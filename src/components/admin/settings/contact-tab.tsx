"use client";

import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { apiGet, apiPut, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { PageLoader } from "@/components/shared/loading-spinner";

const daysOfWeek = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function AdminContactTab() {
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    apiGet<any>("/settings")
      .then((res) => {
        const data = res.data.settings;
        setSettings({
          contactTitle: data.contactTitle || "Contact Us",
          contactSubtitle: data.contactSubtitle || "",
          contactEmail: data.contactEmail || data.email || "",
          contactPhone: data.contactPhone || data.phone || "",
          contactAddress: data.contactAddress || data.address || "",
          contactWhatsapp: data.contactWhatsapp || data.whatsapp || "",
          contactMap: data.contactMap || "",
          contactHours: data.contactHours || {},
        });
      })
      .catch((err) => toast(getApiError(err), "error"))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPut("/settings/contact-page", settings);
      toast("Contact page updated successfully", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const set = (k: string, v: any) =>
    setSettings((p: any) => ({ ...p, [k]: v }));

  const setHours = (day: string, hours: string) => {
    set("contactHours", { ...settings.contactHours, [day]: hours });
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500";

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contact Page</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage contact page content and information
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Page Content */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Page Content</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page Title
            </label>
            <input
              value={settings.contactTitle}
              onChange={(e) => set("contactTitle", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle (optional)
            </label>
            <input
              value={settings.contactSubtitle}
              onChange={(e) => set("contactSubtitle", e.target.value)}
              className={inputCls}
              placeholder="We're here to help..."
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Contact Information
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={settings.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={settings.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={settings.contactAddress}
              onChange={(e) => set("contactAddress", e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Number
            </label>
            <input
              type="tel"
              value={settings.contactWhatsapp}
              onChange={(e) => set("contactWhatsapp", e.target.value)}
              className={inputCls}
              placeholder="+234 XXX XXX XXXX"
            />
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Business Hours
          </h2>
          <p className="text-sm text-gray-500">
            Leave blank for days you're closed
          </p>

          {daysOfWeek.map((day) => (
            <div key={day} className="grid grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-gray-700 capitalize">
                {day}
              </label>
              <input
                type="text"
                value={settings.contactHours[day] || ""}
                onChange={(e) => setHours(day, e.target.value)}
                placeholder="9:00 AM - 5:00 PM"
                className={inputCls + " col-span-2"}
              />
            </div>
          ))}
        </div>

        {/* Google Maps */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Google Maps</h2>
          <p className="text-sm text-gray-500">
            Paste the embed URL from Google Maps (Share → Embed a map)
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Map Embed URL
            </label>
            <input
              type="url"
              value={settings.contactMap}
              onChange={(e) => set("contactMap", e.target.value)}
              className={inputCls}
              placeholder="https://www.google.com/maps/embed?..."
            />
          </div>

          {settings.contactMap && (
            <div className="border rounded-xl overflow-hidden">
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

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Contact Page
        </button>
      </form>
    </div>
  );
}
