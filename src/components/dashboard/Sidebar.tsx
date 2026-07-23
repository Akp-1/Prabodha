'use client';

import {
  LayoutGrid, Users, GraduationCap, Layers, BookOpen, Calendar,
  ClipboardCheck, FileText, BookMarked, Award, Settings, type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS: { key: string; label: string; href: string; icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
  { key: 'students', label: 'Learners', href: '/dashboard/students', icon: Users },
  { key: 'teachers', label: 'Faculty', href: '/dashboard/teachers', icon: GraduationCap },
  { key: 'batches', label: 'Batches', href: '/dashboard/batches', icon: Layers },
  { key: 'subjects', label: 'Subjects', href: '/dashboard/subjects', icon: BookOpen },
  { key: 'timetable', label: 'Timetable', href: '/dashboard/timetable', icon: Calendar },
  { key: 'attendance', label: 'Attendance', href: '/dashboard/attendance', icon: ClipboardCheck },
  { key: 'materials', label: 'Materials', href: '/dashboard/materials', icon: FileText },
  { key: 'homework', label: 'Homework', href: '/dashboard/homework', icon: BookMarked },
  { key: 'marks', label: 'Marks', href: '/dashboard/marks', icon: Award },
  { key: 'settings', label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex flex-col flex-shrink-0 bg-pine-deep text-[#CFE0DC] transition-[width] duration-200 overflow-hidden ${
        collapsed ? 'w-[76px]' : 'w-[260px]'
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-[22px] border-b border-white/10">
        <div className="w-[38px] h-[38px] rounded-[9px] bg-saffron flex items-center justify-center flex-shrink-0 font-display font-bold text-lg text-pine-deep">
          P
        </div>
        {!collapsed && (
          <div>
            <div className="font-display font-semibold text-[17px] text-paper leading-tight">Prabodha</div>
            <div className="font-mono text-[10.5px] text-[#8FA8A2] uppercase tracking-wider mt-0.5">Admin</div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#6C8681] px-[22px] pt-[18px] pb-2">
          Institute
        </div>
      )}

      <nav className="flex flex-col gap-0.5 px-2.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                active ? 'bg-saffron/15 text-paper' : 'text-[#CFE0DC] hover:bg-white/[0.08]'
              }`}
            >
              <item.icon size={18} strokeWidth={1.7} className={active ? 'text-saffron' : ''} />
              {!collapsed && <span className="overflow-hidden text-ellipsis">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
