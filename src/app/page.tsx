'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { Loader2, LogIn, LayoutDashboard } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-paper text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-saffron flex items-center justify-center font-display font-bold text-2xl text-pine-deep shadow-sm">
        P
      </div>
      <div>
        <h1 className="font-display font-bold text-3xl text-ink mb-2">Prabodha</h1>
        <p className="text-ink-soft max-w-md text-sm">
          Lightweight, multi-tenant institution management platform.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-soft font-medium py-2">
          <Loader2 className="animate-spin text-pine" size={20} />
          <span>Redirecting...</span>
        </div>
      ) : user ? (
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-xl bg-saffron text-pine-deep hover:opacity-90 transition-opacity shadow-xs"
        >
          <LayoutDashboard size={18} />
          <span>Go to Dashboard</span>
        </Link>
      ) : (
        <Link
          href="/login"
          className="flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-xl bg-saffron text-pine-deep hover:opacity-90 transition-opacity shadow-xs"
        >
          <LogIn size={18} />
          <span>Sign In to Your Institute</span>
        </Link>
      )}
    </main>
  );
}
