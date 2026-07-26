'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Building2, Mail, Lock, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

const LAST_SLUG_KEY = 'prabodha-last-institute-slug';

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [instituteSlug, setInstituteSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberSlug, setRememberSlug] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSlug = window.localStorage.getItem(LAST_SLUG_KEY);
      if (savedSlug) {
        setInstituteSlug(savedSlug);
      } else {
        setInstituteSlug('demo');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!instituteSlug.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!rememberSlug && typeof window !== 'undefined') {
        window.localStorage.removeItem(LAST_SLUG_KEY);
      }
      await login({
        instituteSlug: instituteSlug.trim(),
        email: email.trim(),
        password,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="flex items-center gap-3 text-ink-soft">
          <Loader2 className="animate-spin text-pine" size={24} />
          <span className="font-medium text-sm">Loading Prabodha...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-saffron flex items-center justify-center font-display font-bold text-2xl text-pine-deep shadow-sm mb-4">
            P
          </div>
          <h2 className="font-display font-bold text-3xl text-ink tracking-tight">
            Sign in to Prabodha
          </h2>
          <p className="mt-2 text-sm text-ink-soft max-w-sm">
            Institution management platform for coaching, schools & training centres.
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white py-8 px-6 shadow-sm border border-line rounded-2xl sm:px-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
                <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Institute Code/Slug */}
            <div>
              <label htmlFor="instituteSlug" className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                Institute Code / Slug
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-soft">
                  <Building2 size={18} strokeWidth={1.8} />
                </div>
                <input
                  id="instituteSlug"
                  type="text"
                  required
                  value={instituteSlug}
                  onChange={(e) => setInstituteSlug(e.target.value)}
                  placeholder="e.g. demo"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-paper border border-line rounded-xl text-ink placeholder-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-soft">
                  <Mail size={18} strokeWidth={1.8} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-paper border border-line rounded-xl text-ink placeholder-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-soft">
                  <Lock size={18} strokeWidth={1.8} />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-paper border border-line rounded-xl text-ink placeholder-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine transition-all"
                />
              </div>
            </div>

            {/* Remember Code Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-ink-soft cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberSlug}
                  onChange={(e) => setRememberSlug(e.target.checked)}
                  className="rounded border-line text-pine focus:ring-pine/30"
                />
                Remember Institute Code
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm bg-saffron text-pine-deep hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-saffron/50 transition-all disabled:opacity-60 shadow-xs mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in to Dashboard</span>
                  <ArrowRight size={16} strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          {/* Quick Info Box */}
          <div className="mt-6 pt-5 border-t border-line text-center text-xs text-ink-soft">
            Default demo login: <code className="bg-paper px-1.5 py-0.5 rounded border border-line font-mono text-ink">demo</code> / <code className="bg-paper px-1.5 py-0.5 rounded border border-line font-mono text-ink">admin@demo.com</code>
          </div>
        </div>
      </div>
    </div>
  );
}
