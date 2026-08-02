'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopBar } from '@/components/dashboard/TopBar';
import { InstitutionStore } from '@/components/dashboard/InstitutionStore';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-paper text-ink-soft">
        <div className="flex items-center gap-3">
          <Loader2 size={24} className="animate-spin text-pine" />
          <span className="font-medium text-sm">Authenticating...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
      <InstitutionStore>
        <div className="flex h-screen w-full overflow-hidden bg-paper">
          <Sidebar collapsed={collapsed} />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <TopBar onToggleCollapse={() => setCollapsed((c) => !c)} />
            <div className="flex-1 overflow-y-auto px-8 pt-9 pb-12">{children}</div>
          </div>
        </div>
      </InstitutionStore>
  );
}