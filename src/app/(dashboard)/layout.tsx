'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopBar } from '@/components/dashboard/TopBar';
import { InstitutionStore } from '@/components/dashboard/InstitutionStore';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

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
