"use client";

import { useState } from "react";
import { Save, Loader2, Eye, EyeOff, Lock, User } from "lucide-react";
import { apiPut, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";

export default function AdminAccountPage() {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const inputCls = "flex-1 px-4 py-3 text-sm focus:outline-none bg-white";

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      toast("Please fill in all fields", "error");
      return;
    }
    if (form.newPassword.length < 8) {
      toast("New password must be at least 8 characters", "error");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast("New passwords do not match", "error");
      return;
    }
    setSaving(true);
    try {
      await apiPut("/auth/update-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast("Password changed — please sign in again", "success");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      // Server clears the refresh cookie and requires re-login
      setTimeout(() => logout(), 1500);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">My Account</h1>

      {/* Profile Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-brand-600" />
          <h2 className="font-semibold text-gray-900">Profile</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Name
            </label>
            <p className="text-sm font-semibold text-gray-900">
              {user?.name || "—"}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Email
            </label>
            <p className="text-sm text-gray-700">{user?.email || "—"}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Role
            </label>
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                user?.role === "ADMIN"
                  ? "bg-purple-100 text-purple-700"
                  : user?.role === "SALES"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
              }`}
            >
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Lock className="w-4 h-4 text-brand-600" />
          <h2 className="font-semibold text-gray-900">Change Password</h2>
        </div>
        <p className="text-xs text-gray-500">
          You will be signed out after changing your password and prompted to
          log in again.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {[
            {
              label: "Current Password",
              key: "currentPassword" as const,
              show: showCurrent,
              toggle: () => setShowCurrent((v) => !v),
            },
            {
              label: "New Password",
              key: "newPassword" as const,
              show: showNew,
              toggle: () => setShowNew((v) => !v),
            },
            {
              label: "Confirm New Password",
              key: "confirmPassword" as const,
              show: showConfirm,
              toggle: () => setShowConfirm((v) => !v),
            },
          ].map(({ label, key, show, toggle }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {label}
              </label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-brand-500 transition-colors">
                <input
                  type={show ? "text" : "password"}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [key]: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={toggle}
                  className="px-3 text-gray-400 hover:text-gray-600"
                >
                  {show ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}

function toast(message: string, variant: string) {
  if (typeof window === "undefined") return;

  const output = `[${variant.toUpperCase()}] ${message}`;

  if (variant === "error") {
    console.error(output);
  } else {
    console.log(output);
  }
}
