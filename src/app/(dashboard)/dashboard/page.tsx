'use client';

import { useEffect, useState } from 'react';
import { Users, GraduationCap, Layers, Calendar, Check } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { apiFetch } from '@/lib/api-client';

const INITIAL_CHECKLIST = [
  { key: 'batch', label: 'Create your first batch or section', done: false },
  { key: 'teachers', label: 'Add faculty members', done: false },
  { key: 'students', label: 'Enroll learners', done: false },
  { key: 'attendance', label: "Record today's attendance", done: false },
];

type StatsState = { students: number; teachers: number; batches: number; todaySessions: number };

export default function DashboardPage() {
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
  const [stats, setStats] = useState<StatsState>({ students: 0, teachers: 0, batches: 0, todaySessions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [students, teachers, batches] = await Promise.all([
          apiFetch<{ length: number }[]>('/api/students').catch(() => []),
          apiFetch<{ length: number }[]>('/api/teachers').catch(() => []),
          apiFetch<{ length: number }[]>('/api/batches').catch(() => []),
        ]);
        setStats({
          students: Array.isArray(students) ? students.length : 0,
          teachers: Array.isArray(teachers) ? teachers.length : 0,
          batches: Array.isArray(batches) ? batches.length : 0,
          todaySessions: 0, // Timetable doesn't have a "today" filter yet
        });
        // Auto-check checklist items based on real data
        setChecklist((list) =>
          list.map((item) => {
            if (item.key === 'batch' && Array.isArray(batches) && batches.length > 0) return { ...item, done: true };
            if (item.key === 'teachers' && Array.isArray(teachers) && teachers.length > 0) return { ...item, done: true };
            if (item.key === 'students' && Array.isArray(students) && students.length > 0) return { ...item, done: true };
            return item;
          })
        );
      } catch {
        // API not available (no token, etc.) — leave zeros
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const toggle = (key: string) => {
    setChecklist((list) => list.map((item) => (item.key === key ? { ...item, done: !item.done } : item)));
  };

  return (
    <>
      <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Welcome back</div>
      <h1 className="font-display font-semibold text-[32px] tracking-tight mb-[30px]">Dashboard</h1>

      <div className="grid grid-cols-2 gap-[18px] mb-[30px] max-w-[720px]">
        <StatCard label="Total Learners" value={loading ? '…' : stats.students} icon={Users} />
        <StatCard label="Faculty Members" value={loading ? '…' : stats.teachers} icon={GraduationCap} />
        <StatCard label="Active Batches" value={loading ? '…' : stats.batches} icon={Layers} />
        <StatCard label="Today's Sessions" value={loading ? '…' : stats.todaySessions} icon={Calendar} />
      </div>

      <div className="bg-white border border-line rounded-xl px-8 py-[30px] max-w-[720px]">
        <div className="font-display font-semibold text-[21px] mb-[18px]">Getting started</div>
        <div className="flex flex-col gap-1">
          {checklist.map((item) => (
            <button
              key={item.key}
              onClick={() => toggle(item.key)}
              className="flex items-center gap-3 py-[11px] px-1.5 rounded-lg text-left w-full text-[15px] hover:bg-paper transition-colors"
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border ${
                  item.done ? 'bg-saffron border-saffron' : 'border-line'
                }`}
              >
                {item.done && <Check size={13} strokeWidth={3} className="text-pine-deep" />}
              </span>
              <span className={item.done ? 'text-ink-soft line-through' : 'text-ink'}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
