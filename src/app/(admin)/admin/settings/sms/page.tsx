"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Send } from "lucide-react";
import { apiGet, apiPut, apiPost, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { PageLoader } from "@/components/shared/loading-spinner";

export default function AdminSmsSettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [sending, setSending] = useState(false);
  const toast = useToast();

  useEffect(() => {
    apiGet<any>("/settings/sms")
      .then((res) => setSettings(res.data.settings))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPut("/settings/sms", settings);
      toast("SMS settings saved", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testPhone) return;
    setSending(true);
    try {
      await apiPost("/settings/sms/test", { phone: testPhone });
      toast("Test SMS sent!", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSending(false);
    }
  };

  const s = (k: string, v: any) => setSettings((p: any) => ({ ...p, [k]: v }));
  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 transition-colors";

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">SMS Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">
            Provider Configuration
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              SMS Provider
            </label>
            <select
              value={settings.smsProvider || "TERMII"}
              onChange={(e) => s("smsProvider", e.target.value)}
              className={inputCls + " bg-white"}
            >
              <option value="TERMII">Termii</option>
              <option value="TWILIO">Twilio</option>
              <option value="INFOBIP">Infobip</option>
              <option value="BULKSMS">BulkSMS Nigeria</option>
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                API Key
              </label>
              <input
                type="password"
                value={settings.smsApiKey || ""}
                onChange={(e) => s("smsApiKey", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Sender ID
              </label>
              <input
                value={settings.smsSenderId || ""}
                onChange={(e) => s("smsSenderId", e.target.value)}
                placeholder="Nigittriple Industry"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Notification Toggles</h2>
          <div className="space-y-2">
            {[
              { k: "smsOrderConfirmation", l: "Order confirmation SMS" },
              { k: "smsShippingNotification", l: "Shipping notifications" },
              { k: "smsDeliveryNotification", l: "Delivery confirmation" },
              { k: "smsOtpEnabled", l: "OTP via SMS" },
            ].map(({ k, l }) => (
              <label key={k} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings[k] ?? false}
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

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Send Test SMS</h2>
        <div className="flex gap-3">
          <input
            type="tel"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="+2348000000000"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={sendTest}
            disabled={sending || !testPhone}
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
