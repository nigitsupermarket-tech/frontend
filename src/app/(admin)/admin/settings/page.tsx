"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Send, Plus, X, Bell } from "lucide-react";
import { apiGet, apiPut, apiPost, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { PageLoader } from "@/components/shared/loading-spinner";

export default function AdminEmailSettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  // Notification emails — managed as a local array, saved separately
  const [notifEmails, setNotifEmails] = useState<string[]>([]);
  const [newNotifEmail, setNewNotifEmail] = useState("");

  const toast = useToast();

  useEffect(() => {
    apiGet<any>("/settings")
      .then((res) => {
        const s = res.data?.settings ?? {};
        setSettings(s);
        setNotifEmails(
          Array.isArray(s.adminNotificationEmails)
            ? s.adminNotificationEmails
            : [],
        );
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPut("/settings", settings);
      toast("Email settings saved", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail) return;
    setSending(true);
    try {
      await apiPost("/settings/email/test", { to: testEmail });
      toast("Test email sent!", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSending(false);
    }
  };

  // ── Notification email helpers ──────────────────────────────────────────────
  const addNotifEmail = () => {
    const email = newNotifEmail.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast("Please enter a valid email address", "error");
      return;
    }
    if (notifEmails.includes(email)) {
      toast("Email already in the list", "error");
      return;
    }
    setNotifEmails((prev) => [...prev, email]);
    setNewNotifEmail("");
  };

  const removeNotifEmail = (email: string) => {
    setNotifEmails((prev) => prev.filter((e) => e !== email));
  };

  const saveNotifEmails = async () => {
    setSavingNotif(true);
    try {
      await apiPut("/settings/notifications", {
        adminNotificationEmails: notifEmails,
      });
      toast("Notification emails saved", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSavingNotif(false);
    }
  };

  const s = (k: string, v: any) => setSettings((p: any) => ({ ...p, [k]: v }));
  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 transition-colors";

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Email Settings</h1>

      {/* ── SMTP + Sender form ─────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">SMTP Configuration</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { k: "smtpHost", l: "SMTP Host", pl: "smtp.gmail.com" },
              { k: "smtpPort", l: "SMTP Port", pl: "587" },
              { k: "smtpUser", l: "Username / Email", pl: "you@example.com" },
              {
                k: "smtpPassword",
                l: "Password / App Key",
                pl: "••••••••••••",
              },
            ].map(({ k, l, pl }) => (
              <div key={k}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {l}
                </label>
                <input
                  type={k === "smtpPassword" ? "password" : "text"}
                  value={settings[k] || ""}
                  onChange={(e) => s(k, e.target.value)}
                  placeholder={pl}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="smtpSecure"
              checked={settings.smtpSecure ?? false}
              onChange={(e) => s("smtpSecure", e.target.checked)}
              className="rounded border-gray-300 text-brand-600"
            />
            <label
              htmlFor="smtpSecure"
              className="text-sm font-medium text-gray-700"
            >
              Use SSL/TLS (port 465)
            </label>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Sender Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                From Name
              </label>
              <input
                value={settings.fromName || ""}
                onChange={(e) => s("fromName", e.target.value)}
                placeholder="Nigittriple Industry"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                From Email
              </label>
              <input
                type="email"
                value={settings.fromEmail || ""}
                onChange={(e) => s("fromEmail", e.target.value)}
                placeholder="noreply@nigittriple.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reply-To Email
              </label>
              <input
                type="email"
                value={settings.replyToEmail || ""}
                onChange={(e) => s("replyToEmail", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Notification Toggles</h2>
          <div className="space-y-2">
            {[
              { k: "sendOrderConfirmation", l: "Order confirmation emails" },
              { k: "sendShippingNotification", l: "Shipping notifications" },
              { k: "sendPasswordReset", l: "Password reset emails" },
              { k: "sendEmailVerification", l: "Email verification" },
              { k: "sendLowStockAlert", l: "Low stock alerts (admin)" },
            ].map(({ k, l }) => (
              <label key={k} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings[k] ?? true}
                  onChange={(e) => s(k, e.target.checked)}
                  className="rounded border-gray-300 text-brand-600"
                />
                <span className="text-sm text-gray-700">{l}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}{" "}
          Save Settings
        </button>
      </form>

      {/* ── Admin Notification Emails ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand-600" />
          <h2 className="font-semibold text-gray-900">
            Admin Notification Emails
          </h2>
        </div>
        <p className="text-sm text-gray-500">
          These email addresses will be notified whenever a customer places an
          online order. You can add multiple recipients.
        </p>

        {/* Email tags */}
        <div className="min-h-[40px]">
          {notifEmails.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              No notification emails added yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {notifEmails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 border border-brand-200 text-brand-800 text-sm rounded-lg font-medium"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeNotifEmail(email)}
                    className="text-brand-400 hover:text-red-500 transition-colors ml-0.5"
                    aria-label={`Remove ${email}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Add new email row */}
        <div className="flex gap-2">
          <input
            type="email"
            value={newNotifEmail}
            onChange={(e) => setNewNotifEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addNotifEmail();
              }
            }}
            placeholder="admin@example.com"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 transition-colors"
          />
          <button
            type="button"
            onClick={addNotifEmail}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        <button
          type="button"
          onClick={saveNotifEmails}
          disabled={savingNotif}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
        >
          {savingNotif ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}{" "}
          Save Notification Emails
        </button>
      </div>

      {/* ── Send Test Email ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Send Test Email</h2>
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={sendTest}
            disabled={sending || !testEmail}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-60 transition-colors"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}{" "}
            Send Test
          </button>
        </div>
      </div>
    </div>
  );
}
