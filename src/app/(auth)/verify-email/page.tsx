// frontend/src/app/(auth)/verify-email/page.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react";
import { useState, useEffect, useRef, Suspense } from "react";
import { apiPost, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";

// ─── Inner component — uses useSearchParams so must be inside <Suspense> ─────
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const toast = useToast();

  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired" | "no-token">(
    token ? "loading" : "no-token"
  );
  const [resendEmail, setResendEmail] = useState("");
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    apiPost("/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((err: any) => {
        const msg: string = getApiError(err) ?? "";
        if (msg.toLowerCase().includes("expired")) {
          setStatus("expired");
        } else {
          setStatus("error");
        }
      });
  }, [token]);

  const handleResend = async () => {
    if (!resendEmail) {
      toast("Please enter your email address", "error");
      return;
    }
    setResendLoading(true);
    try {
      await apiPost("/auth/resend-verification", { email: resendEmail });
      setResendSent(true);
      toast("Verification email sent!", "success");
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setResendLoading(false);
    }
  };

  // ── No token in URL ──────────────────────────────────────────────────────
  if (status === "no-token") {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Check your email</h1>
        <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
          We sent a verification link to your email address. Click it to activate your account.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Didn't receive it? Check your spam folder or request a new one below.
        </p>
        <ResendForm
          email={resendEmail}
          onEmailChange={setResendEmail}
          onResend={handleResend}
          resendLoading={resendLoading}
          resendSent={resendSent}
        />
        <Link href="/login" className="mt-4 inline-block text-sm text-brand-600 hover:text-brand-800">
          Back to sign in
        </Link>
      </div>
    );
  }

  // ── Verifying ────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600 mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Verifying your email address…</p>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Email verified!</h1>
        <p className="mt-3 text-sm text-gray-500">
          Your account is now active. You can sign in and start shopping.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // ── Expired ──────────────────────────────────────────────────────────────
  if (status === "expired") {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Link expired</h1>
        <p className="mt-3 text-sm text-gray-500">
          This verification link has expired. Request a new one below.
        </p>
        <ResendForm
          email={resendEmail}
          onEmailChange={setResendEmail}
          onResend={handleResend}
          resendLoading={resendLoading}
          resendSent={resendSent}
        />
        <Link href="/login" className="mt-2 inline-block text-sm text-brand-600 hover:text-brand-800">
          Back to sign in
        </Link>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
        <XCircle className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="font-display text-2xl font-bold text-gray-900">Invalid link</h1>
      <p className="mt-3 text-sm text-gray-500">
        This verification link is invalid or has already been used.
      </p>
      <div className="mt-6 flex flex-col gap-3 items-center">
        <Link href="/register" className="text-sm text-brand-600 hover:text-brand-800 font-medium">
          Create a new account
        </Link>
        <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

// ─── Resend form sub-component ────────────────────────────────────────────────
function ResendForm({
  email,
  onEmailChange,
  onResend,
  resendLoading,
  resendSent,
}: {
  email: string;
  onEmailChange: (v: string) => void;
  onResend: () => void;
  resendLoading: boolean;
  resendSent: boolean;
}) {
  if (resendSent) {
    return (
      <p className="mt-6 text-sm text-green-600 font-medium">
        ✓ New verification email sent — check your inbox.
      </p>
    );
  }
  return (
    <div className="mt-6 space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="Enter your email address"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-colors"
      />
      <button
        onClick={onResend}
        disabled={resendLoading}
        className="w-full py-2.5 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 text-sm"
      >
        {resendLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        Resend Verification Email
      </button>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────
export default function VerifyEmailPage() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8">
        <Suspense
          fallback={
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 animate-spin text-brand-600 mx-auto" />
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
