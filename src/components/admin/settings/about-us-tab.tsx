"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { apiGet, apiPut, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { PageLoader } from "@/components/shared/loading-spinner";
import { DragDropMediaUploader } from "@/components/shared/drag-drop-media-uploader";
import { RichTextEditor } from "@/components/shared/rich-text-editor";

const iconOptions = [
  "target",
  "eye",
  "award",
  "users",
  "trending",
  "globe",
  "check",
  "star",
  "heart",
  "shield",
];

interface MediaItem {
  url: string;
  publicId?: string;
  type: "image" | "video";
}

export default function AdminAboutUsTab() {
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await apiGet<any>("/settings");
      const data = res.data.settings;
      setSettings({
        aboutUsTitle: data.aboutUsTitle || "About Us",
        aboutUsContent: data.aboutUsContent || "",
        aboutUsImage: data.aboutUsImage || "",
        aboutUsMission: data.aboutUsMission || "",
        aboutUsVision: data.aboutUsVision || "",
        aboutUsValues: data.aboutUsValues || [],
        aboutUsTeam: data.aboutUsTeam || [],
        aboutUsStats: data.aboutUsStats || [],
      });
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPut("/settings/about-us", settings);
      toast("About Us page updated successfully", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const set = (k: string, v: any) =>
    setSettings((p: any) => ({ ...p, [k]: v }));

  const addValue = () => {
    set("aboutUsValues", [
      ...settings.aboutUsValues,
      { title: "", description: "", icon: "award" },
    ]);
  };

  const updateValue = (index: number, field: string, value: any) => {
    const updated = [...settings.aboutUsValues];
    updated[index] = { ...updated[index], [field]: value };
    set("aboutUsValues", updated);
  };

  const removeValue = (index: number) => {
    set(
      "aboutUsValues",
      settings.aboutUsValues.filter((_: any, i: number) => i !== index),
    );
  };

  const addTeamMember = () => {
    set("aboutUsTeam", [
      ...settings.aboutUsTeam,
      { name: "", role: "", image: "", bio: "" },
    ]);
  };

  const updateTeamMember = (index: number, field: string, value: any) => {
    const updated = [...settings.aboutUsTeam];
    updated[index] = { ...updated[index], [field]: value };
    set("aboutUsTeam", updated);
  };

  const removeTeamMember = (index: number) => {
    set(
      "aboutUsTeam",
      settings.aboutUsTeam.filter((_: any, i: number) => i !== index),
    );
  };

  const addStat = () => {
    set("aboutUsStats", [
      ...settings.aboutUsStats,
      { label: "", value: "", icon: "trending" },
    ]);
  };

  const updateStat = (index: number, field: string, value: any) => {
    const updated = [...settings.aboutUsStats];
    updated[index] = { ...updated[index], [field]: value };
    set("aboutUsStats", updated);
  };

  const removeStat = (index: number) => {
    set(
      "aboutUsStats",
      settings.aboutUsStats.filter((_: any, i: number) => i !== index),
    );
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 transition-colors";

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">About Us Page</h1>
        <p className="text-sm text-gray-500 mt-1">
          Customize your About Us page content
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Basic Info</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page Title
            </label>
            <input
              value={settings.aboutUsTitle}
              onChange={(e) => set("aboutUsTitle", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Main Content
            </label>
            <RichTextEditor
              value={settings.aboutUsContent}
              onChange={(content) => set("aboutUsContent", content)}
              placeholder="Write about your company, its history, achievements..."
            />
          </div>

          <DragDropMediaUploader
            value={
              settings.aboutUsImage
                ? [{ url: settings.aboutUsImage, type: "image" as const }]
                : []
            }
            onChange={(media) => set("aboutUsImage", media[0]?.url || "")}
            maxFiles={1}
            folder="about-us"
            accept="image"
            label="Hero Image"
            showPreview
          />
        </div>

        {/* Mission & Vision */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Mission & Vision
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Our Mission
            </label>
            <textarea
              value={settings.aboutUsMission}
              onChange={(e) => set("aboutUsMission", e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Our Vision
            </label>
            <textarea
              value={settings.aboutUsVision}
              onChange={(e) => set("aboutUsVision", e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>

        {/* Core Values */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Core Values</h2>
            <button
              type="button"
              onClick={addValue}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" /> Add Value
            </button>
          </div>

          {settings.aboutUsValues.map((value: any, index: number) => (
            <div
              key={index}
              className="border border-gray-200 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Value {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeValue(index)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Icon
                  </label>
                  <select
                    value={value.icon}
                    onChange={(e) => updateValue(index, "icon", e.target.value)}
                    className={inputCls + " bg-white"}
                  >
                    {iconOptions.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    value={value.title}
                    onChange={(e) =>
                      updateValue(index, "title", e.target.value)
                    }
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    value={value.description}
                    onChange={(e) =>
                      updateValue(index, "description", e.target.value)
                    }
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Statistics</h2>
            <button
              type="button"
              onClick={addStat}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" /> Add Stat
            </button>
          </div>

          {settings.aboutUsStats.map((stat: any, index: number) => (
            <div
              key={index}
              className="border border-gray-200 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Stat {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeStat(index)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Icon
                  </label>
                  <select
                    value={stat.icon}
                    onChange={(e) => updateStat(index, "icon", e.target.value)}
                    className={inputCls + " bg-white"}
                  >
                    {iconOptions.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Value (e.g., "500+")
                  </label>
                  <input
                    value={stat.value}
                    onChange={(e) => updateStat(index, "value", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Label
                  </label>
                  <input
                    value={stat.label}
                    onChange={(e) => updateStat(index, "label", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Team Members */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Team Members
            </h2>
            <button
              type="button"
              onClick={addTeamMember}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" /> Add Member
            </button>
          </div>

          {settings.aboutUsTeam.map((member: any, index: number) => (
            <div
              key={index}
              className="border border-gray-200 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Member {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeTeamMember(index)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <DragDropMediaUploader
                value={
                  member.image
                    ? [{ url: member.image, type: "image" as const }]
                    : []
                }
                onChange={(media) =>
                  updateTeamMember(index, "image", media[0]?.url || "")
                }
                maxFiles={1}
                folder="team"
                accept="image"
                label="Photo"
                showPreview
              />

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    value={member.name}
                    onChange={(e) =>
                      updateTeamMember(index, "name", e.target.value)
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <input
                    value={member.role}
                    onChange={(e) =>
                      updateTeamMember(index, "role", e.target.value)
                    }
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Bio (optional)
                </label>
                <textarea
                  value={member.bio}
                  onChange={(e) =>
                    updateTeamMember(index, "bio", e.target.value)
                  }
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          ))}
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
          Save About Us Page
        </button>
      </form>
    </div>
  );
}
