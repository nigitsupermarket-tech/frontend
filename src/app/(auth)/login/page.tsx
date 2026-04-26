// frontend/src/app/(auth)/login/page.tsx
"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { useState, Suspense } from "react";
import { loginSchema, type LoginForm } from "@/lib/validations";
import { useAuth } from "@/hooks/useAuth";
import { apiPost, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import axios from "axios";

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const { login, isLoading } = useAuth();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    // Clear previous unverified state
    setUnverifiedEmail(null);
    setResendSent(false);
    try {
      await login(data, redirectTo);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const msg: string = error.response?.data?.message ?? "";
        // ✅ FIX: Detect the "please verify" error specifically and show an
        // inline resend prompt instead of a generic red toast. This is far
        // better UX — the user immediately understands what to do.
        if (msg.toLowerCase().includes("verify your email")) {
          setUnverifiedEmail(data.email);
          return; // Don't let useAuth show the toast too
        }
      }
      // All other errors (wrong password, server error) fall through
      // useAuth already shows the toast for non-400 errors
    }
  };

  const handleResend = async () => {
    const email = unverifiedEmail || getValues("email");
    if (!email) return;
    setResendLoading(true);
    try {
      await apiPost("/auth/resend-verification", { email });
      setResendSent(true);
      toast("Verification email sent — check your inbox!", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8">
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Sign in to your Nigittriple Industry account
        </p>
      </div>

      {/* ── Unverified email banner ── */}
      {unverifiedEmail && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                Email not verified
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Please check your inbox for the verification link we sent when you registered.
              </p>
              {resendSent ? (
                <p className="text-xs text-green-700 font-medium mt-2">
                  ✓ New verification email sent!
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="mt-2 text-xs font-semibold text-amber-800 underline hover:text-amber-900 disabled:opacity-60 flex items-center gap-1"
                >
                  {resendLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Resend verification email
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-colors"
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-brand-600 hover:text-brand-800"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              {...register("password")}
              className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-colors"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Sign In
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-brand-600 hover:text-brand-800">
          Create account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <Suspense
        fallback={
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
