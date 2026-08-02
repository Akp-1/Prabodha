'use client';

import { useEffect, useState } from 'react';
import { Users, GraduationCap, Layers, Calendar, BookMarked, Award, ClipboardCheck, Check } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/components/auth/AuthProvider';

// JS-style day index (0=Sunday..6=Saturday) — matches TimetableSlot.dayOfWeek.
function todayDayOfWeek() {
    return new Date().getDay();
}

const INITIAL_CHECKLIST = [
  { key: 'batch', label: 'Create your first batch or section', done: false },
  { key: 'teachers', label: 'Add faculty members', done: false },
  { key: 'students', label: 'Enroll learners', done: false },
  { key: 'attendance', label: "Record today's attendance", done: false },
];

function AdminHome() {
    const [stats, setStats] = useState({ students: 0, teachers: 0, batches: 0, todaySessions: 0 });
    const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [students, teachers, batches, slots] = await Promise.all([
                    apiFetch<unknown[]>('/api/students'),
                    apiFetch<unknown[]>('/api/teachers'),
                    apiFetch<unknown[]>('/api/batches'),
                    apiFetch<{ dayOfWeek: number }[]>('/api/timetable'),
                ]);
                setStats({
                    students: students.length,
                    teachers: teachers.length,
                    batches: batches.length,
                    todaySessions: slots.filter((s) => s.dayOfWeek === todayDayOfWeek()).length,
                });
                // Auto-check checklist items based on real data
                setChecklist((list) =>
                  list.map((item) => {
                    if (item.key === 'batch' && batches.length > 0) return { ...item, done: true };
                    if (item.key === 'teachers' && teachers.length > 0) return { ...item, done: true };
                    if (item.key === 'students' && students.length > 0) return { ...item, done: true };
                    return item;
                  })
                );
            } catch (err) {
                setError(err instanceof ApiClientError ? err.message : 'Failed to load institute stats.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const toggle = (key: string) => {
      setChecklist((list) => list.map((item) => (item.key === key ? { ...item, done: !item.done } : item)));
    };

    return (
        <>
            <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Welcome back</div>
            <h1 className="font-display font-semibold text-[32px] tracking-tight mb-[30px]">Institute overview</h1>

            {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 max-w-[720px]">{error}</div>}

            <div className="grid grid-cols-2 gap-[18px] mb-[30px] max-w-[720px]">
                <StatCard label="Total Learners" value={isLoading ? '…' : stats.students} icon={Users} />
                <StatCard label="Faculty Members" value={isLoading ? '…' : stats.teachers} icon={GraduationCap} />
                <StatCard label="Active Batches" value={isLoading ? '…' : stats.batches} icon={Layers} />
                <StatCard label="Today's Sessions" value={isLoading ? '…' : stats.todaySessions} icon={Calendar} />
            </div>

            {/* Getting Started checklist (from contributor) */}
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

function TeacherHome() {
    const [stats, setStats] = useState({ assignments: 0, todaySessions: 0, pendingHomework: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [assignments, slots, homework] = await Promise.all([
                    apiFetch<unknown[]>('/api/assignments'),
                    apiFetch<{ dayOfWeek: number }[]>('/api/timetable'),
                    apiFetch<{ summary: { pending: number } }[]>('/api/homework'),
                ]);
                setStats({
                    assignments: assignments.length,
                    todaySessions: slots.filter((s) => s.dayOfWeek === todayDayOfWeek()).length,
                    pendingHomework: homework.reduce((sum, h) => sum + h.summary.pending, 0),
                });
            } catch (err) {
                setError(err instanceof ApiClientError ? err.message : 'Failed to load your overview.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    return (
        <>
            <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Welcome back</div>
            <h1 className="font-display font-semibold text-[32px] tracking-tight mb-[30px]">Your classes</h1>

            {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 max-w-[720px]">{error}</div>}

            <div className="grid grid-cols-3 gap-[18px] max-w-[720px]">
                <StatCard label="Assigned Classes" value={isLoading ? '…' : stats.assignments} icon={GraduationCap} />
                <StatCard label="Sessions Today" value={isLoading ? '…' : stats.todaySessions} icon={Calendar} />
                <StatCard label="Homework Pending" value={isLoading ? '…' : stats.pendingHomework} icon={BookMarked} />
            </div>
        </>
    );
}

function StudentHome() {
    const [stats, setStats] = useState({ pendingHomework: 0, materials: 0, gradedExams: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [homework, materials, exams] = await Promise.all([
                    apiFetch<{ statuses: { status: string }[] }[]>('/api/homework'),
                    apiFetch<unknown[]>('/api/materials'),
                    apiFetch<{ myMark?: unknown }[]>('/api/exams'),
                ]);
                setStats({
                    pendingHomework: homework.filter((h) => h.statuses[0]?.status !== 'completed').length,
                    materials: materials.length,
                    gradedExams: exams.filter((e) => e.myMark).length,
                });
            } catch (err) {
                setError(err instanceof ApiClientError ? err.message : 'Failed to load your overview.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    return (
        <>
            <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Welcome back</div>
            <h1 className="font-display font-semibold text-[32px] tracking-tight mb-[30px]">Your learning space</h1>

            {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 max-w-[720px]">{error}</div>}

            <div className="grid grid-cols-3 gap-[18px] max-w-[720px]">
                <StatCard label="Homework Pending" value={isLoading ? '…' : stats.pendingHomework} icon={BookMarked} />
                <StatCard label="Study Materials" value={isLoading ? '…' : stats.materials} icon={ClipboardCheck} />
                <StatCard label="Assessments Graded" value={isLoading ? '…' : stats.gradedExams} icon={Award} />
            </div>
        </>
    );
}

function ParentHome() {
    return (
        <>
            <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Welcome back</div>
            <h1 className="font-display font-semibold text-[32px] tracking-tight mb-[18px]">Parent dashboard</h1>
            <div className="max-w-[560px] rounded-xl border border-line bg-white px-6 py-8 text-sm text-ink-soft">
                A dedicated view of your linked children&apos;s homework, materials, and marks
                hasn&apos;t been built yet — this is tracked as an open item on the project
                roadmap. Reach out to your institute admin in the meantime for anything
                you need.
            </div>
        </>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();

    if (user?.role === 'teacher') return <TeacherHome />;
    if (user?.role === 'student') return <StudentHome />;
    if (user?.role === 'parent') return <ParentHome />;
    return <AdminHome />;
}
