'use client';

import { PanelLeft, LogOut } from 'lucide-react';

export function TopBar({ onToggleCollapse }: { onToggleCollapse: () => void }) {
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
        <div className="font-display font-semibold text-[17px]">Prabodha</div>
      </div>
      <button className="flex items-center gap-2 font-semibold text-[13.5px] px-4 py-2.5 rounded-md border border-line bg-white hover:border-pine transition-colors">
        <LogOut size={15} strokeWidth={1.8} />
        Sign out
      </button>
    </div>
  );
}
