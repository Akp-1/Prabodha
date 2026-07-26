'use client';

import { PanelLeft, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

export function TopBar({ onToggleCollapse }: { onToggleCollapse: () => void }) {
    const { user, logout } = useAuth();
    const router = useRouter();

    function handleSignOut() {
        logout();
        router.push('/login');
    }

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
            <div className="flex items-center gap-4">
                {user && (
                    <div className="text-right leading-tight hidden sm:block">
                        <div className="text-[13.5px] font-semibold text-ink">{user.name}</div>
                        <div className="text-xs text-ink-soft capitalize">{user.role}</div>
                    </div>
                )}
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 font-semibold text-[13.5px] px-4 py-2.5 rounded-md border border-line bg-white hover:border-pine transition-colors"
                >
                    <LogOut size={15} strokeWidth={1.8} />
                    Sign out
                </button>
            </div>
        </div>
    );
}