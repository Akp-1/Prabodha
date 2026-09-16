'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  Loader2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [instituteName, setInstituteName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!instituteName.trim() || !adminName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/register-institute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instituteName: instituteName.trim(),
          adminName: adminName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Registration failed.');
      }

      // Store the token and redirect to dashboard
      if (typeof window !== 'undefined' && data.token) {
        window.localStorage.setItem('prabodha-auth-token', data.token);
        // Store the institute slug for future logins
        if (data.institute?.slug) {
          window.localStorage.setItem('prabodha-last-institute-slug', data.institute.slug);
        }
      }

      // Full page reload to pick up the new auth state in AuthProvider
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Registration failed. Please try again.');
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
          <h1 className="font-display font-bold text-3xl text-ink tracking-tight">
            Register your Institute
          </h1>
          <p className="mt-2 text-sm text-ink-soft max-w-sm">
            Create a new institution on Prabodha. You&apos;ll be the admin of your institute.
          </p>
        </div>

        {/* Registration Form Card */}
        <div className="bg-white py-8 px-6 shadow-sm border border-line rounded-2xl sm:px-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
                <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Institute Name */}
            <div>
              <label htmlFor="instituteName" className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                Institute Name <span className="text-red-400">*</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-soft">
                  <Building2 size={18} strokeWidth={1.8} />
                </div>
                <input
                  id="instituteName"
                  type="text"
                  required
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                  placeholder="e.g. Vector Classes Barhi"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-paper border border-line rounded-xl text-ink placeholder-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine transition-all"
                />
              </div>
            </div>

            {/* Admin Name */}
            <div>
              <label htmlFor="adminName" className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                Your Name (Admin) <span className="text-red-400">*</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-soft">
                  <User size={18} strokeWidth={1.8} />
                </div>
                <input
                  id="adminName"
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-paper border border-line rounded-xl text-ink placeholder-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                Email Address <span className="text-red-400">*</span>
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
                  placeholder="admin@yourschool.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-paper border border-line rounded-xl text-ink placeholder-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine transition-all"
                />
              </div>
            </div>

            {/* Phone (Optional) */}
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                Phone <span className="text-ink-soft/40 normal-case font-normal">(optional)</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-soft">
                  <Phone size={18} strokeWidth={1.8} />
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-paper border border-line rounded-xl text-ink placeholder-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-soft">
                  <Lock size={18} strokeWidth={1.8} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="block w-full pl-10 pr-11 py-2.5 text-sm bg-paper border border-line rounded-xl text-ink placeholder-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-soft hover:text-ink transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                Confirm Password <span className="text-red-400">*</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-soft">
                  <CheckCircle2 size={18} strokeWidth={1.8} />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="block w-full pl-10 pr-11 py-2.5 text-sm bg-paper border border-line rounded-xl text-ink placeholder-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-soft hover:text-ink transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
                </button>
              </div>
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
                  <span>Creating Institute...</span>
                </>
              ) : (
                <>
                  <span>Create Institute & Sign In</span>
                  <ArrowRight size={16} strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 pt-5 border-t border-line text-center text-sm text-ink-soft">
            Already have an institute?{' '}
            <Link href="/login" className="font-semibold text-pine hover:text-pine-deep transition-colors">
              Sign in instead &larr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
