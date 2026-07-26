'use client';

import { PanelLeft, LogOut, User } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

export function TopBar({ onToggleCollapse }: { onToggleCollapse: () => void }) {
  const { user, institute, logout } = useAuth();

  return (
    <div className="flex items-center justify-between px-8 py-[18px] bg-paper border-b border-line flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleCollapse}
          className="text-ink-soft p-1 rounded-md hover:bg-line transition-colors"
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={19} strokeWidth={1.7} />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-[17px] text-ink">
            {institute?.name || 'Prabodha'}
          </span>
          {institute?.slug && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-line text-ink-soft font-mono">
              {institute.slug}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <div className="w-7 h-7 rounded-full bg-saffron/20 border border-saffron/40 flex items-center justify-center text-pine-deep font-semibold text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-semibold text-ink leading-tight">{user.name}</span>
              <span className="text-[10px] uppercase font-bold text-pine tracking-wide">
                {user.role}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-2 font-semibold text-[13.5px] px-3.5 py-2 rounded-lg border border-line bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all text-ink-soft"
        >
          <LogOut size={15} strokeWidth={1.8} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}
