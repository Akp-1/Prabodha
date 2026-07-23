'use client';

import { useState } from 'react';
import { Users, GraduationCap, Layers, Calendar, Check } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';

// TODO: replace with real data once /api/students, /api/teachers, /api/batches
// and /api/timetable are ported (see README roadmap — Modules 3-7).
const MOCK_STATS = { students: 1, teachers: 0, batches: 0, todaySessions: 0 };
const MOCK_INSTITUTE_NAME = 'Demo Institution';

const INITIAL_CHECKLIST = [
  { key: 'batch', label: 'Create your first batch or section', done: false },
  { key: 'teachers', label: 'Add faculty members', done: false },
  { key: 'students', label: 'Enroll learners', done: true },
  { key: 'attendance', label: "Record today's attendance", done: false },
];

export default function DashboardPage() {
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);

  const toggle = (key: string) => {
    setChecklist((list) => list.map((item) => (item.key === key ? { ...item, done: !item.done } : item)));
  };

  return (
    <>
      <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Welcome back</div>
      <h1 className="font-display font-semibold text-[32px] tracking-tight mb-[30px]">{MOCK_INSTITUTE_NAME}</h1>

      <div className="grid grid-cols-2 gap-[18px] mb-[30px] max-w-[720px]">
        <StatCard label="Total Learners" value={MOCK_STATS.students} icon={Users} />
        <StatCard label="Faculty Members" value={MOCK_STATS.teachers} icon={GraduationCap} />
        <StatCard label="Active Batches" value={MOCK_STATS.batches} icon={Layers} />
        <StatCard label="Today's Sessions" value={MOCK_STATS.todaySessions} icon={Calendar} />
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
