'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    Users, GraduationCap, Layers, Calendar, BookMarked, Award, ClipboardCheck, Check,
    ClipboardList, FileText, ClipboardEdit, type LucideIcon,
} from 'lucide-react';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { TodayPanel, type TodaySlot } from '@/components/dashboard/TodayPanel';
import { ActivityFeed, type ActivityItem } from '@/components/dashboard/ActivityFeed';
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

function QuickLinks({ items }: { items: { label: string; href: string; icon: LucideIcon }[] }) {
    return (
        <div className="bg-white border border-line rounded-xl px-6 py-6">
            <div className="font-display font-semibold text-[17px] mb-3">Quick links</div>
            <div className="flex flex-col gap-1">
                {items.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 py-2 px-1.5 rounded-lg text-[14px] font-medium text-ink hover:bg-paper transition-colors"
                    >
                        <span className="w-7 h-7 rounded-md bg-pine/[0.07] flex items-center justify-center flex-shrink-0">
                            <item.icon size={14} strokeWidth={1.8} className="text-pine" />
                        </span>
                        {item.label}
                    </Link>
                ))}
            </div>
        </div>
    );
}

function AdminHome() {
    const [stats, setStats] = useState({ students: 0, teachers: 0, batches: 0, todaySessions: 0 });
    const [todaySlots, setTodaySlots] = useState<TodaySlot[]>([]);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [students, teachers, batches, slots, homework, materials, sessions] = await Promise.all([
                    apiFetch<unknown[]>('/api/students'),
                    apiFetch<unknown[]>('/api/teachers'),
                    apiFetch<unknown[]>('/api/batches'),
                    apiFetch<(TodaySlot & { dayOfWeek: number })[]>('/api/timetable'),
                    apiFetch<{ id: string; title: string; createdAt: string; subject: { name: string }; batch: { name: string } }[]>('/api/homework'),
                    apiFetch<{ id: string; title: string; createdAt: string; subject: { name: string }; batch: { name: string } }[]>('/api/materials'),
                    apiFetch<{ id: string; submittedAt: string; bst: { subject: { name: string }; batch: { name: string } } | null }[]>('/api/attendance'),
                ]);
                const today = slots.filter((s) => s.dayOfWeek === todayDayOfWeek());
                setStats({
                    students: students.length,
                    teachers: teachers.length,
                    batches: batches.length,
                    todaySessions: today.length,
                });
                setTodaySlots(today);

                const feed: ActivityItem[] = [
                    ...homework.map((h) => ({
                        id: `hw-${h.id}`, icon: BookMarked,
                        title: `Homework assigned: ${h.title}`,
                        subtitle: `${h.subject.name} · ${h.batch.name}`, at: h.createdAt,
                    })),
                    ...materials.map((m) => ({
                        id: `mat-${m.id}`, icon: FileText,
                        title: `Material uploaded: ${m.title}`,
                        subtitle: `${m.subject.name} · ${m.batch.name}`, at: m.createdAt,
                    })),
                    ...sessions.filter((s) => s.bst).map((s) => ({
                        id: `att-${s.id}`, icon: ClipboardEdit,
                        title: 'Attendance marked',
                        subtitle: `${s.bst!.subject.name} · ${s.bst!.batch.name}`, at: s.submittedAt,
                    })),
                ]
                    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                    .slice(0, 6);
                setActivity(feed);

                // Auto-check checklist items based on real data
                setChecklist((list) =>
                  list.map((item) => {
                    if (item.key === 'batch' && batches.length > 0) return { ...item, done: true };
                    if (item.key === 'teachers' && teachers.length > 0) return { ...item, done: true };
                    if (item.key === 'students' && students.length > 0) return { ...item, done: true };
                    if (item.key === 'attendance' && sessions.length > 0) return { ...item, done: true };
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

    const doneCount = checklist.filter((i) => i.done).length;
    const progressPct = Math.round((doneCount / checklist.length) * 100);

    return (
        <div className="max-w-[1400px]">
            <DashboardHeader
                title="Institute overview"
                action={
                    <Link
                        href="/dashboard/attendance"
                        className="inline-flex items-center gap-2 bg-pine text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-pine-deep transition-colors"
                    >
                        <ClipboardList size={16} strokeWidth={2} />
                        Mark attendance
                    </Link>
                }
            />

            {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-[18px] items-start">
                <div className="min-w-0">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-[18px] mb-[18px]">
                        {isLoading ? (
                            <>
                                <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
                            </>
                        ) : (
                            <>
                                <StatCard label="Total Learners" value={stats.students} icon={Users} delay={0} />
                                <StatCard label="Faculty Members" value={stats.teachers} icon={GraduationCap} delay={60} />
                                <StatCard label="Active Batches" value={stats.batches} icon={Layers} delay={120} />
                                <StatCard
                                    label="Today's Sessions" value={stats.todaySessions} icon={Calendar} delay={180}
                                    hint={stats.todaySessions > 0 ? `${stats.todaySessions} on the schedule` : 'Nothing scheduled'}
                                />
                            </>
                        )}
                    </div>

                    {/* Getting Started checklist (from contributor) */}
                    <div className="bg-white border border-line rounded-xl px-8 py-[30px] mb-[18px]">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-display font-semibold text-[21px]">Getting started</div>
                        <span className="text-[12px] font-medium text-ink-soft">{doneCount}/{checklist.length}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-paper overflow-hidden mb-[18px]">
                        <div className="h-full rounded-full bg-saffron transition-all duration-500" style={{ width: `${progressPct}%` }} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
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

                    <ActivityFeed items={activity} isLoading={isLoading} />
                </div>

                <div className="flex flex-col gap-[18px]">
                    <TodayPanel slots={todaySlots} isLoading={isLoading} />
                    <QuickLinks
                        items={[
                            { label: 'Add a learner', href: '/dashboard/students', icon: Users },
                            { label: 'Add faculty', href: '/dashboard/teachers', icon: GraduationCap },
                            { label: 'New batch', href: '/dashboard/batches', icon: Layers },
                            { label: 'Weekly timetable', href: '/dashboard/timetable', icon: Calendar },
                        ]}
                    />
                </div>
            </div>
        </div>
    );
}

function TeacherHome() {
    const [stats, setStats] = useState({ assignments: 0, todaySessions: 0, pendingHomework: 0 });
    const [todaySlots, setTodaySlots] = useState<TodaySlot[]>([]);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [assignments, slots, homework, materials] = await Promise.all([
                    apiFetch<unknown[]>('/api/assignments'),
                    apiFetch<(TodaySlot & { dayOfWeek: number })[]>('/api/timetable'),
                    apiFetch<{ id: string; title: string; createdAt: string; summary: { pending: number }; subject: { name: string }; batch: { name: string }; assigner: { id: string } }[]>('/api/homework'),
                    apiFetch<{ id: string; title: string; createdAt: string; subject: { name: string }; batch: { name: string }; uploader: { id: string } }[]>('/api/materials'),
                ]);
                const today = slots.filter((s) => s.dayOfWeek === todayDayOfWeek());
                setStats({
                    assignments: assignments.length,
                    todaySessions: today.length,
                    pendingHomework: homework.reduce((sum, h) => sum + h.summary.pending, 0),
                });
                setTodaySlots(today);

                const feed: ActivityItem[] = [
                    ...homework.map((h) => ({
                        id: `hw-${h.id}`, icon: BookMarked,
                        title: `Homework assigned: ${h.title}`,
                        subtitle: `${h.subject.name} · ${h.batch.name}`, at: h.createdAt,
                    })),
                    ...materials.map((m) => ({
                        id: `mat-${m.id}`, icon: FileText,
                        title: `Material uploaded: ${m.title}`,
                        subtitle: `${m.subject.name} · ${m.batch.name}`, at: m.createdAt,
                    })),
                ]
                    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                    .slice(0, 6);
                setActivity(feed);
            } catch (err) {
                setError(err instanceof ApiClientError ? err.message : 'Failed to load your overview.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    return (
        <div className="max-w-[1400px]">
            <DashboardHeader title="Your classes" />

            {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-[18px] items-start">
                <div className="min-w-0">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-[18px] mb-[18px]">
                        {isLoading ? (
                            <>
                                <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
                            </>
                        ) : (
                            <>
                                <StatCard label="Assigned Classes" value={stats.assignments} icon={GraduationCap} delay={0} />
                                <StatCard label="Sessions Today" value={stats.todaySessions} icon={Calendar} delay={60} />
                                <StatCard label="Homework Pending" value={stats.pendingHomework} icon={BookMarked} delay={120} />
                            </>
                        )}
                    </div>

                    <ActivityFeed items={activity} isLoading={isLoading} />
                </div>

                <div className="flex flex-col gap-[18px]">
                    <TodayPanel slots={todaySlots} isLoading={isLoading} />
                    <QuickLinks
                        items={[
                            { label: 'Mark attendance', href: '/dashboard/attendance', icon: ClipboardList },
                            { label: 'Assign homework', href: '/dashboard/homework', icon: BookMarked },
                            { label: 'Upload materials', href: '/dashboard/materials', icon: FileText },
                        ]}
                    />
                </div>
            </div>
        </div>
    );
}

function StudentHome() {
    const [stats, setStats] = useState({ pendingHomework: 0, materials: 0, gradedExams: 0 });
    const [upcoming, setUpcoming] = useState<{ id: string; title: string; subject: string; dueDate: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [homework, materials, exams] = await Promise.all([
                    apiFetch<{ id: string; title: string; dueDate: string; subject: { name: string }; statuses: { status: string }[] }[]>('/api/homework'),
                    apiFetch<unknown[]>('/api/materials'),
                    apiFetch<{ myMark?: unknown }[]>('/api/exams'),
                ]);
                setStats({
                    pendingHomework: homework.filter((h) => h.statuses[0]?.status !== 'completed').length,
                    materials: materials.length,
                    gradedExams: exams.filter((e) => e.myMark).length,
                });
                setUpcoming(
                    homework
                        .filter((h) => h.statuses[0]?.status !== 'completed')
                        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                        .slice(0, 4)
                        .map((h) => ({ id: h.id, title: h.title, subject: h.subject.name, dueDate: h.dueDate }))
                );
            } catch (err) {
                setError(err instanceof ApiClientError ? err.message : 'Failed to load your overview.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    return (
        <div className="max-w-[1400px]">
            <DashboardHeader title="Your learning space" />

            {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-[18px] items-start">
                <div className="min-w-0">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-[18px] mb-[18px]">
                        {isLoading ? (
                            <>
                                <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
                            </>
                        ) : (
                            <>
                                <StatCard label="Homework Pending" value={stats.pendingHomework} icon={BookMarked} delay={0} />
                                <StatCard label="Study Materials" value={stats.materials} icon={ClipboardCheck} delay={60} />
                                <StatCard label="Assessments Graded" value={stats.gradedExams} icon={Award} delay={120} />
                            </>
                        )}
                    </div>

                    <div className="bg-white border border-line rounded-xl px-8 py-[30px]">
                        <div className="font-display font-semibold text-[21px] mb-[18px]">Upcoming homework</div>
                        {isLoading ? (
                            <div className="flex flex-col gap-3">
                                {[1, 2, 3].map((i) => <div key={i} className="h-[52px] rounded-lg bg-paper animate-pulse" />)}
                            </div>
                        ) : upcoming.length === 0 ? (
                            <div className="text-sm text-ink-soft py-2">Nothing pending — you&apos;re all caught up.</div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                {upcoming.map((h) => {
                                    const daysLeft = Math.ceil((new Date(h.dueDate).getTime() - Date.now()) / 86400000);
                                    const overdue = daysLeft < 0;
                                    return (
                                        <div key={h.id} className="flex items-center gap-3 py-2.5 px-1.5 rounded-lg">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${overdue ? 'bg-red-50' : 'bg-pine/[0.07]'}`}>
                                                <BookMarked size={14} strokeWidth={1.8} className={overdue ? 'text-red-500' : 'text-pine'} />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[14px] font-medium text-ink truncate">{h.title}</div>
                                                <div className="text-[12px] text-ink-soft truncate">{h.subject}</div>
                                            </div>
                                            <div className={`text-[11.5px] font-medium flex-shrink-0 ${overdue ? 'text-red-500' : 'text-ink-soft'}`}>
                                                {overdue ? 'Overdue' : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-[18px]">
                    <QuickLinks
                        items={[
                            { label: 'View homework', href: '/dashboard/homework', icon: BookMarked },
                            { label: 'Study materials', href: '/dashboard/materials', icon: ClipboardCheck },
                            { label: 'My marks', href: '/dashboard/marks', icon: Award },
                            { label: 'My attendance', href: '/dashboard/attendance', icon: ClipboardList },
                        ]}
                    />
                </div>
            </div>
        </div>
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
        <div className="max-w-[1400px]">
            <DashboardHeader title="Parent dashboard" />

            {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

            {isLoading ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-[18px]">
                    {[1, 2].map((i) => (
                        <div key={i} className="bg-white border border-line rounded-xl h-[200px] animate-pulse" />
                    ))}
                </div>
            ) : children.length === 0 ? (
                <div className="max-w-[560px] rounded-xl border border-line bg-white px-6 py-8 text-sm text-ink-soft">
                    No children have been linked to your account yet. Please ask your institute admin to link your child&apos;s profile to your parent account.
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-[18px] items-start">
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
        </div>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();

    if (user?.role === 'teacher') return <TeacherHome />;
    if (user?.role === 'student') return <StudentHome />;
    if (user?.role === 'parent') return <ParentHome />;
    return <AdminHome />;
}
