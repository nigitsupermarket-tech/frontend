"use client";

import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { apiGet, apiPut, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { RichTextEditor } from "@/components/shared/rich-text-editor";

export default function AdminTermsTab() {
  const [settings, setSettings] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    apiGet<any>("/settings")
      .then((res) => {
        const data = res.data.settings;
        setSettings({
          termsTitle: data.termsTitle || "Terms of Service",
          termsContent: data.termsContent || "",
        });
      })
      .catch((err) => toast(getApiError(err), "error"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPut("/settings/terms", settings);
      toast("Terms of service updated successfully", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500";

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Terms of Service
        </h2>
        <p className="text-sm text-gray-500">
          Manage your website's terms of service content
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Page Title
        </label>
        <input
          value={settings.termsTitle}
          onChange={(e) =>
            setSettings({ ...settings, termsTitle: e.target.value })
          }
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Terms of Service Content
        </label>
        <RichTextEditor
          value={settings.termsContent}
          onChange={(content) =>
            setSettings({ ...settings, termsContent: content })
          }
          placeholder="Enter your terms of service..."
        />
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
        Save Terms of Service
      </button>
    </form>
  );
}
