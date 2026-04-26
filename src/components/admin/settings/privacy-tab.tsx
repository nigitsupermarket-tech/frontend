"use client";

import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { apiGet, apiPut, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { RichTextEditor } from "@/components/shared/rich-text-editor";

export default function AdminPrivacyTab() {
  const [settings, setSettings] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    apiGet<any>("/settings")
      .then((res) => {
        const data = res.data.settings;
        setSettings({
          privacyTitle: data.privacyTitle || "Privacy Policy",
          privacyContent: data.privacyContent || "",
        });
      })
      .catch((err) => toast(getApiError(err), "error"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPut("/settings/privacy", settings);
      toast("Privacy policy updated successfully", "success");
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
          Privacy Policy
        </h2>
        <p className="text-sm text-gray-500">
          Manage your website's privacy policy content
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Page Title
        </label>
        <input
          value={settings.privacyTitle}
          onChange={(e) =>
            setSettings({ ...settings, privacyTitle: e.target.value })
          }
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Privacy Policy Content
        </label>
        <RichTextEditor
          value={settings.privacyContent}
          onChange={(content) =>
            setSettings({ ...settings, privacyContent: content })
          }
          placeholder="Enter your privacy policy..."
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
        Save Privacy Policy
      </button>
    </form>
  );
}
