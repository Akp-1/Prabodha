'use client';

import { useEffect, useRef, useState } from 'react';
import { PanelLeft, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

export function TopBar({ onToggleCollapse }: { onToggleCollapse: () => void }) {
  const { user, institute, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [menuOpen]);

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

      {user && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-lg border transition-colors ${
              menuOpen ? 'bg-white border-line' : 'border-transparent hover:bg-white hover:border-line'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-saffron/20 border border-saffron/40 flex items-center justify-center text-pine-deep font-semibold text-xs flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-xs font-semibold text-ink leading-tight">{user.name}</span>
              <span className="text-[10px] uppercase font-bold text-pine tracking-wide">{user.role}</span>
            </div>
            <ChevronDown size={15} strokeWidth={2} className={`text-ink-soft transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+8px)] w-[200px] bg-white border border-line rounded-xl shadow-[0_12px_28px_-8px_rgba(15,61,62,0.22)] py-1.5 z-20"
            >
              <div className="px-3.5 py-2 border-b border-line mb-1">
                <div className="text-sm font-semibold text-ink truncate">{user.name}</div>
                <div className="text-[11px] text-ink-soft truncate">{user.email}</div>
              </div>
              <button
                role="menuitem"
                onClick={logout}
                className="flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 text-[13.5px] font-medium text-ink-soft hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut size={15} strokeWidth={1.8} />
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
