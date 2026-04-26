'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { useState } from 'react';
import { forgotPasswordSchema, type ForgotPasswordForm } from '@/lib/validations';
import { apiPost, getApiError } from '@/lib/api';
import { useToast } from '@/store/uiStore';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    try {
      await apiPost('/auth/forgot-password', data);
      setSent(true);
    } catch (err) {
      toast(getApiError(err), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8">
        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-brand-600" />
            </div>
            <h2 className="font-display text-2xl font-bold text-gray-900">Check your email</h2>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              We've sent a password reset link. Please check your inbox and spam folder.
            </p>
            <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-800">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
                <ArrowLeft className="w-4 h-4" /> Back
              </Link>
              <h1 className="font-display text-2xl font-bold text-gray-900">Forgot password?</h1>
              <p className="mt-2 text-sm text-gray-500">Enter your email and we'll send you a reset link.</p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input
                  id="email" type="email" autoComplete="email" {...register('email')}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-colors"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <button type="submit" disabled={isLoading}
                className="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />} Send Reset Link
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
