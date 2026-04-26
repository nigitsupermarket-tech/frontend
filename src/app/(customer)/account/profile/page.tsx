//frontend/src/app/(customer)/account/profile/page.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Save, ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/store/uiStore";
import { apiPut, apiPost, getApiError } from "@/lib/api";
import {
  updatePasswordSchema,
  type UpdatePasswordForm,
} from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const toast = useToast();
  const [profileSaving, setProfileSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePasswordForm>({
    resolver: zodResolver(updatePasswordSchema),
  });

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await apiPut<any>(`/users/${user!.id}`, profile);
      setUser(res.data.user);
      toast("Profile updated", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async (data: UpdatePasswordForm) => {
    setPwSaving(true);
    try {
      await apiPost("/auth/update-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast("Password updated successfully", "success");
      reset();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="container py-10 max-w-xl space-y-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back</span>
      </button>
      <h1 className="font-display text-2xl font-bold text-gray-900">
        Profile Settings
      </h1>

      {/* Profile form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-5">
          Personal Information
        </h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name
            </label>
            <input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              value={user?.email}
              disabled
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number
            </label>
            <input
              value={profile.phone}
              onChange={(e) =>
                setProfile({ ...profile, phone: e.target.value })
              }
              type="tel"
              placeholder="+234 800 000 0000"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <button
            type="submit"
            disabled={profileSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {profileSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-5">Change Password</h2>
        <form onSubmit={handleSubmit(changePassword)} className="space-y-4">
          {[
            { name: "currentPassword", label: "Current Password" },
            { name: "newPassword", label: "New Password" },
            { name: "confirmPassword", label: "Confirm New Password" },
          ].map(({ name, label }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {label}
              </label>
              <input
                type="password"
                {...register(name as any)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              {(errors as any)[name] && (
                <p className="mt-1 text-xs text-red-500">
                  {(errors as any)[name]?.message}
                </p>
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={pwSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-60 transition-colors"
          >
            {pwSaving && <Loader2 className="w-4 h-4 animate-spin" />} Update
            Password
          </button>
        </form>
      </div>
    </div>
  );
}
