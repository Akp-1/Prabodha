'use client';

import { useEffect, useState } from 'react';
import { Users, GraduationCap, Layers, Calendar, BookMarked, Award, ClipboardCheck, Check } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { SkeletonDashboard, SkeletonList } from '@/components/ui/Skeleton';
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

            {isLoading ? (
                <div className="max-w-[720px] mb-[30px]">
                    <SkeletonDashboard cards={4} />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-[18px] mb-[30px] max-w-[720px]">
                    <StatCard label="Total Learners" value={stats.students} icon={Users} />
                    <StatCard label="Faculty Members" value={stats.teachers} icon={GraduationCap} />
                    <StatCard label="Active Batches" value={stats.batches} icon={Layers} />
                    <StatCard label="Today's Sessions" value={stats.todaySessions} icon={Calendar} />
                </div>
            )}

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

            {isLoading ? (
                <div className="max-w-[720px]">
                    <SkeletonDashboard cards={3} />
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-[18px] max-w-[720px]">
                    <StatCard label="Assigned Classes" value={stats.assignments} icon={GraduationCap} />
                    <StatCard label="Sessions Today" value={stats.todaySessions} icon={Calendar} />
                    <StatCard label="Homework Pending" value={stats.pendingHomework} icon={BookMarked} />
                </div>
            )}
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

            {isLoading ? (
                <div className="max-w-[720px]">
                    <SkeletonDashboard cards={3} />
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-[18px] max-w-[720px]">
                    <StatCard label="Homework Pending" value={stats.pendingHomework} icon={BookMarked} />
                    <StatCard label="Study Materials" value={stats.materials} icon={ClipboardCheck} />
                    <StatCard label="Assessments Graded" value={stats.gradedExams} icon={Award} />
                </div>
            )}
        </>
    );
}

interface ChildData {
    student: { id: string; name: string; email: string; batch: { id: string; name: string } | null };
    attendance: { total: number; present: number; absent: number; percentage: number };
    homework: { total: number; completed: number; pending: number };
    marks: { examName: string; subject: string; obtained: number; maxMarks: number; date: string }[];
}

function AttendanceRing({ percentage, present, total }: { percentage: number; present: number; total: number }) {
    const radius = 36;
    const stroke = 6;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const color = percentage >= 75 ? '#2D6A4F' : percentage >= 50 ? '#E9A94A' : '#D64045';

    return (
        <div className="flex flex-col items-center gap-1.5">
            <svg width={90} height={90} className="-rotate-90">
                <circle cx={45} cy={45} r={radius} fill="none" stroke="#E8E0D4" strokeWidth={stroke} />
                <circle cx={45} cy={45} r={radius} fill="none" stroke={color} strokeWidth={stroke}
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
            </svg>
            <span className="font-display font-semibold text-lg text-ink" style={{ marginTop: -60 }}>{percentage}%</span>
            <span className="text-[11px] text-ink-soft font-medium mt-6">{present}/{total} sessions</span>
        </div>
    );
}

function HomeworkBar({ completed, total }: { completed: number; total: number }) {
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return (
        <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-ink-soft font-medium">Homework</span>
                <span className="font-semibold text-ink">{completed}/{total}</span>
            </div>
            <div className="h-2 rounded-full bg-[#E8E0D4] overflow-hidden">
                <div className="h-full rounded-full bg-pine transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-[11px] text-ink-soft mt-1">{total - completed} pending</div>
        </div>
    );
}

function ParentHome() {
    const [children, setChildren] = useState<ChildData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const data = await apiFetch<ChildData[]>('/api/parent-dashboard');
                setChildren(data);
            } catch (err) {
                setError(err instanceof ApiClientError ? err.message : 'Failed to load dashboard.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    return (
        <>
            <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Welcome back</div>
            <h1 className="font-display font-semibold text-[32px] tracking-tight mb-[30px]">Parent dashboard</h1>

            {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 max-w-[720px]">{error}</div>}

            {isLoading ? (
                <div className="max-w-[720px]">
                    <SkeletonList items={2} />
                </div>
            ) : children.length === 0 ? (
                <div className="max-w-[560px] rounded-xl border border-line bg-white px-6 py-8 text-sm text-ink-soft">
                    No children have been linked to your account yet. Please ask your institute admin to link your child&apos;s profile to your parent account.
                </div>
            ) : (
                <div className="space-y-6 max-w-[820px]">
                    {children.map((child) => (
                        <div key={child.student.id} className="bg-white border border-line rounded-xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center gap-3 px-6 py-4 border-b border-line bg-paper">
                                <div className="w-9 h-9 rounded-full bg-pine flex items-center justify-center text-white font-semibold text-sm">
                                    {child.student.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-display font-semibold text-[17px] text-ink">{child.student.name}</div>
                                    <div className="text-[12px] text-ink-soft">{child.student.batch?.name ?? 'No batch assigned'}</div>
                                </div>
                            </div>

                            {/* Stats row */}
                            <div className="flex items-start gap-8 px-6 py-5">
                                <AttendanceRing percentage={child.attendance.percentage} present={child.attendance.present} total={child.attendance.total} />
                                <HomeworkBar completed={child.homework.completed} total={child.homework.total} />
                                <div className="text-center">
                                    <div className="font-display font-semibold text-[28px] text-ink">{child.marks.length}</div>
                                    <div className="text-[11px] text-ink-soft font-medium">Exams Graded</div>
                                </div>
                            </div>

                            {/* Recent marks */}
                            {child.marks.length > 0 && (
                                <div className="px-6 pb-5">
                                    <div className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">Recent Marks</div>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-line text-left text-ink-soft text-xs">
                                                <th className="pb-1.5 font-medium">Exam</th>
                                                <th className="pb-1.5 font-medium">Subject</th>
                                                <th className="pb-1.5 font-medium text-right">Score</th>
                                                <th className="pb-1.5 font-medium text-right">%</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {child.marks.map((m, i) => {
                                                const pct = Math.round((m.obtained / m.maxMarks) * 100);
                                                return (
                                                    <tr key={i} className="border-b border-line/50 last:border-0">
                                                        <td className="py-2 text-ink">{m.examName}</td>
                                                        <td className="py-2 text-ink-soft">{m.subject}</td>
                                                        <td className="py-2 text-right font-medium text-ink">{m.obtained}/{m.maxMarks}</td>
                                                        <td className="py-2 text-right">
                                                            <span className={`font-semibold ${pct >= 75 ? 'text-pine' : pct >= 50 ? 'text-saffron-deep' : 'text-red-500'}`}>
                                                                {pct}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
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
