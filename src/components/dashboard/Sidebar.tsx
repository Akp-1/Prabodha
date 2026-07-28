'use client';

import {
  LayoutGrid, Users, GraduationCap, Layers, BookOpen, Calendar,
  ClipboardCheck, FileText, BookMarked, Award, Settings, type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

type Role = 'admin' | 'teacher' | 'student' | 'parent';

// Which roles can meaningfully use each page — kept in sync with the actual
// API's requireRole calls, not just "looks relevant." A link only appears if
// the underlying data would actually load for that role: e.g. Timetable and
// Attendance currently block students entirely at the API layer (see
// src/app/api/timetable/route.ts, src/app/api/attendance/route.ts), so
// students don't get a nav link to a page that would just show an error.
const NAV_ITEMS: { key: string; label: string; href: string; icon: LucideIcon; roles: Role[] }[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutGrid, roles: ['admin', 'teacher', 'student', 'parent'] },
  { key: 'students', label: 'Learners', href: '/dashboard/students', icon: Users, roles: ['admin'] },
  { key: 'teachers', label: 'Faculty', href: '/dashboard/teachers', icon: GraduationCap, roles: ['admin'] },
  { key: 'batches', label: 'Batches', href: '/dashboard/batches', icon: Layers, roles: ['admin'] },
  { key: 'subjects', label: 'Subjects', href: '/dashboard/subjects', icon: BookOpen, roles: ['admin'] },
  { key: 'timetable', label: 'Timetable', href: '/dashboard/timetable', icon: Calendar, roles: ['admin', 'teacher'] },
  { key: 'attendance', label: 'Attendance', href: '/dashboard/attendance', icon: ClipboardCheck, roles: ['admin', 'teacher'] },
  { key: 'materials', label: 'Materials', href: '/dashboard/materials', icon: FileText, roles: ['admin', 'teacher', 'student'] },
  { key: 'homework', label: 'Homework', href: '/dashboard/homework', icon: BookMarked, roles: ['admin', 'teacher', 'student'] },
  { key: 'marks', label: 'Marks', href: '/dashboard/marks', icon: Award, roles: ['admin', 'teacher', 'student'] },
  { key: 'settings', label: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['admin'] },
];

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  teacher: 'Faculty',
  student: 'Learner',
  parent: 'Parent',
};

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = (user?.role as Role) ?? 'admin';

  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

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
                <div className="font-mono text-[10.5px] text-[#8FA8A2] uppercase tracking-wider mt-0.5">{ROLE_LABEL[role]}</div>
              </div>
          )}
        </div>

        {!collapsed && (
            <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#6C8681] px-[22px] pt-[18px] pb-2">
              Institute
            </div>
        )}

        <nav className="flex flex-col gap-0.5 px-2.5">
          {items.map((item) => {
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