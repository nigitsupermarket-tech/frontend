"use client";

// frontend/src/app/(auth)/register/page.tsx

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, AlertCircle, Mail } from "lucide-react";
import { useState } from "react";
import { registerSchema, type RegisterForm } from "@/lib/validations";
import { useAuth } from "@/hooks/useAuth";
import { getFieldErrors } from "@/lib/api";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});
  // ✅ FIX: Track registered email so we can show the success/verify state
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const { register: registerUser, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  const onSubmit = async (data: RegisterForm) => {
    setBackendErrors({});
    try {
      const { confirmPassword: _, ...payload } = data;
      await registerUser(payload);
      // ✅ FIX: After successful registration, show the "check your email"
      // state right here on the page instead of immediately redirecting to
      // /login — the user CAN'T log in yet until they verify, so sending
      // them to /login would just give them a confusing "verify your email"
      // error when they try to sign in.
      setRegisteredEmail(data.email);
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      setBackendErrors(fieldErrors);
    }
  };

  const getError = (field: keyof RegisterForm) =>
    errors[field]?.message || backendErrors[field];

  // ── Post-registration success state ──────────────────────────────────────
  if (registeredEmail) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-brand-600" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Check your email
          </h1>
          <p className="mt-3 text-sm text-gray-500 leading-relaxed">
            We sent a verification link to{" "}
            <span className="font-semibold text-gray-700">{registeredEmail}</span>.
            Click it to activate your account.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Can't find it? Check your spam folder.
          </p>
          <div className="mt-6 space-y-3">
            <Link
              href="/verify-email"
              className="block w-full py-2.5 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors text-sm text-center"
            >
              Go to Verify Email page
            </Link>
            <Link
              href="/login"
              className="block text-sm text-brand-600 hover:text-brand-800"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Create account
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Join Nigittriple Industry and start shopping
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              {...register("name")}
              placeholder="Jane Doe"
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${
                getError("name")
                  ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                  : "border-gray-200 focus:border-brand-500 focus:ring-brand-100"
              }`}
            />
            {getError("name") && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {getError("name")}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              placeholder="you@example.com"
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${
                getError("email")
                  ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                  : "border-gray-200 focus:border-brand-500 focus:ring-brand-100"
              }`}
            />
            {getError("email") && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {getError("email")}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              {...register("phone")}
              placeholder="+234 800 000 0000"
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${
                getError("phone")
                  ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                  : "border-gray-200 focus:border-brand-500 focus:ring-brand-100"
              }`}
            />
            {getError("phone") && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {getError("phone")}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...register("password")}
                placeholder="e.g., MyPass123!"
                className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${
                  getError("password")
                    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                    : "border-gray-200 focus:border-brand-500 focus:ring-brand-100"
                }`}
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
            {!getError("password") && (
              <p className="mt-1.5 text-xs text-gray-500">
                Must be 8+ characters with uppercase, lowercase, number, and symbol (!@#$)
              </p>
            )}
            {getError("password") && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {getError("password")}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                {...register("confirmPassword")}
                placeholder="Repeat your password"
                className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${
                  getError("confirmPassword")
                    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                    : "border-gray-200 focus:border-brand-500 focus:ring-brand-100"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {getError("confirmPassword") && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {getError("confirmPassword")}
              </p>
            )}
            {password && confirmPassword && !getError("confirmPassword") && (
              <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                ✓ Passwords match
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
