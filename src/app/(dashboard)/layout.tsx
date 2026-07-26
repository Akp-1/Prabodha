'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopBar } from '@/components/dashboard/TopBar';
import { InstitutionStore } from '@/components/dashboard/InstitutionStore';
import { useAuth } from '@/components/auth/AuthProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [isLoading, user, router]);

  // Avoid flashing the dashboard (and its fake data) before we've confirmed
  // there's actually a logged-in user.
  if (isLoading || !user) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-paper text-ink-soft text-sm">
          Loading…
        </div>
    );
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