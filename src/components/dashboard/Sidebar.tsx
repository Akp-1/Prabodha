'use client';

import {
  LayoutGrid, Users, GraduationCap, UsersRound, Layers, BookOpen, Calendar,
  ClipboardCheck, FileText, BookMarked, Award, Settings, type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

type Role = 'admin' | 'teacher' | 'student' | 'parent';

interface NavItem { key: string; label: string; href: string; icon: LucideIcon; roles: Role[] }

// Which roles can meaningfully use each page — kept in sync with the actual
// API's requireRole calls, not just "looks relevant." A link only appears if
// the underlying data would actually load for that role: e.g. Timetable
// still blocks students entirely at the API layer (see
// src/app/api/timetable/route.ts), so students don't get a nav link to a
// page that would just show an error. Attendance now supports a student's
// own (read-only) view, added alongside a dedicated student UI, and — as of
// the ParentStudentLink-based scoping added to /api/attendance — a parent's
// read-only view per linked child too.
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutGrid, roles: ['admin', 'teacher', 'student', 'parent'] },
    ],
  },
  {
    label: 'People',
    items: [
      { key: 'students', label: 'Learners', href: '/dashboard/students', icon: Users, roles: ['admin'] },
      { key: 'teachers', label: 'Faculty', href: '/dashboard/teachers', icon: GraduationCap, roles: ['admin'] },
      { key: 'parents', label: 'Parents', href: '/dashboard/parents', icon: UsersRound, roles: ['admin'] },
    ],
  },
  {
    label: 'Academics',
    items: [
      { key: 'batches', label: 'Batches', href: '/dashboard/batches', icon: Layers, roles: ['admin'] },
      { key: 'subjects', label: 'Subjects', href: '/dashboard/subjects', icon: BookOpen, roles: ['admin'] },
      { key: 'timetable', label: 'Timetable', href: '/dashboard/timetable', icon: Calendar, roles: ['admin', 'teacher'] },
      { key: 'attendance', label: 'Attendance', href: '/dashboard/attendance', icon: ClipboardCheck, roles: ['admin', 'teacher', 'student', 'parent'] },
      { key: 'materials', label: 'Materials', href: '/dashboard/materials', icon: FileText, roles: ['admin', 'teacher', 'student', 'parent'] },
      { key: 'homework', label: 'Homework', href: '/dashboard/homework', icon: BookMarked, roles: ['admin', 'teacher', 'student', 'parent'] },
      { key: 'marks', label: 'Marks', href: '/dashboard/marks', icon: Award, roles: ['admin', 'teacher', 'student', 'parent'] },
    ],
  },
  {
    label: 'Admin',
    items: [
      { key: 'settings', label: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['admin'] },
    ],
  },
];

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  teacher: 'Faculty',
  student: 'Learner',
  parent: 'Parent',
};

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = (user?.role as Role) ?? 'admin';

  const groups = NAV_GROUPS
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) }))
    .filter((group) => group.items.length > 0);

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

        <nav className="flex flex-col flex-1 overflow-y-auto px-2.5 pt-2 pb-4">
          {groups.map((group) => (
              <div key={group.label} className="mb-1">
                {!collapsed && (
                    <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#6C8681] px-[9.5px] pt-[14px] pb-2">
                      {group.label}
                    </div>
                )}
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            title={item.label}
                            aria-label={item.label}
                            aria-current={active ? 'page' : undefined}
                            className={`relative flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                active ? 'bg-saffron/15 text-paper' : 'text-[#CFE0DC] hover:bg-white/[0.08]'
                            }`}
                        >
                          {active && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-r-full bg-saffron" />
                          )}
                          <item.icon size={18} strokeWidth={1.7} className={active ? 'text-saffron' : ''} />
                          {!collapsed && <span className="overflow-hidden text-ellipsis">{item.label}</span>}
                        </Link>
                    );
                  })}
                </div>
              </div>
          ))}
        </nav>

        <div className="mt-auto px-5 py-4 border-t border-white/10 font-mono text-[10px] text-[#5F7873] uppercase tracking-wider">
          {collapsed ? 'v1' : 'Prabodha · v1.0'}
        </div>
      </aside>
  );
}
