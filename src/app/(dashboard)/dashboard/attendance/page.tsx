'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/components/auth/AuthProvider';
import { CircularProgress } from '@/components/dashboard/CircularProgress';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

type Assignment = {
  id: string;
  batch: { id: string; name: string };
  subject: { id: string; name: string };
};

type Student = { id: string; name: string; email: string; batchId: string | null };

type AttendanceRecord = { studentId: string; status: 'present' | 'absent'; student?: { name: string } };
type AttendanceSession = {
  id: string;
  sessionDate: string;
  batchSubjectTeacherId: string;
  records: AttendanceRecord[];
  myRecord?: { studentId: string; status: 'present' | 'absent' } | null;
  summary?: { total: number; present: number; absent: number };
  bst?: { batch: { name: string }; subject: { name: string } } | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

// ---------------------------------------------------------------------------
// Teacher / admin: fast-input marking grid
// ---------------------------------------------------------------------------

function TeacherAttendanceView() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentId, setAssignmentId] = useState('');
  const [date, setDate] = useState(todayISO());

  const [students, setStudents] = useState<Student[]>([]);
  const [absentIds, setAbsentIds] = useState<string[]>([]);
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const [recentSessions, setRecentSessions] = useState<AttendanceSession[]>([]);

  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAssignment = assignments.find((a) => a.id === assignmentId) ?? null;
  const present = students.length - absentIds.length;
  const filteredStudents = students.filter((s) => !query || s.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    (async () => {
      setIsLoadingAssignments(true);
      setError(null);
      try {
        const data = await apiFetch<Assignment[]>('/api/assignments');
        setAssignments(data);
        if (data.length) setAssignmentId(data[0].id);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load your assigned classes.');
      } finally {
        setIsLoadingAssignments(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedAssignment) return;
    (async () => {
      setIsLoadingRoster(true);
      setError(null);
      setExistingSessionId(null);
      try {
        const [roster, sessions] = await Promise.all([
          apiFetch<Student[]>(`/api/students?batchId=${selectedAssignment.batch.id}`),
          apiFetch<AttendanceSession[]>(
              `/api/attendance?batchId=${selectedAssignment.batch.id}&subjectId=${selectedAssignment.subject.id}&date=${date}`
          ),
        ]);
        setStudents(roster);

        const existing = sessions[0];
        if (existing) {
          setExistingSessionId(existing.id);
          setAbsentIds(existing.records.filter((r) => r.status === 'absent').map((r) => r.studentId));
        } else {
          setAbsentIds([]);
        }
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load the class roster.');
      } finally {
        setIsLoadingRoster(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, date]);

  async function loadRecent() {
    try {
      const sessions = await apiFetch<AttendanceSession[]>('/api/attendance');
      setRecentSessions(sessions.slice(0, 8));
    } catch {
      // Non-fatal.
    }
  }

  useEffect(() => {
    loadRecent();
  }, []);

  function toggle(studentId: string) {
    setAbsentIds((current) => (current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]));
  }

  function markAllPresent() {
    setAbsentIds([]);
  }

  async function submit() {
    if (!selectedAssignment || !students.length) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const records = students.map((s) => ({
        studentId: s.id,
        status: absentIds.includes(s.id) ? 'absent' : 'present',
      }));

      if (existingSessionId) {
        await apiFetch(`/api/attendance/${existingSessionId}`, { method: 'PATCH', body: JSON.stringify({ records }) });
      } else {
        const created = await apiFetch<AttendanceSession>('/api/attendance', {
          method: 'POST',
          body: JSON.stringify({ batchSubjectTeacherId: selectedAssignment.id, sessionDate: date, records }),
        });
        setExistingSessionId(created.id);
      }
      await loadRecent();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to submit attendance.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
      <div className="max-w-[1120px]">
        <DashboardHeader title="Attendance" />

        {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        <div className="mb-5 flex flex-col gap-4 rounded-xl border border-line bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <select
                value={assignmentId}
                onChange={(e) => setAssignmentId(e.target.value)}
                disabled={isLoadingAssignments || !assignments.length}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold"
            >
              {!assignments.length && <option>No assigned classes</option>}
              {assignments.map((a) => (
                  <option key={a.id} value={a.id}>{a.batch.name} · {a.subject.name}</option>
              ))}
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold" />
            {existingSessionId && (
                <span className="rounded-md bg-saffron/15 px-2.5 py-1 text-xs font-semibold text-saffron-deep">Already submitted — editing will update</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-line">
                <div className="h-full bg-pine transition-all" style={{ width: students.length ? `${(present / students.length) * 100}%` : '0%' }} />
              </div>
              <span className="text-xs font-semibold text-ink-soft whitespace-nowrap">{present}/{students.length} present</span>
            </div>
            <label className="flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm">
              <Search size={15} className="text-ink-soft" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student..." className="w-36 bg-transparent outline-none placeholder:text-ink-soft" />
            </label>
            <button onClick={markAllPresent} className="whitespace-nowrap rounded-md border border-line px-3 py-2 text-xs font-semibold hover:bg-paper">Mark all present</button>
          </div>
        </div>

        {isLoadingRoster ? (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">Loading roster…</div>
        ) : filteredStudents.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredStudents.map((s) => {
                const absent = absentIds.includes(s.id);
                return (
                    <button
                        key={s.id}
                        onClick={() => toggle(s.id)}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                            absent ? 'border-red-200 bg-red-50' : 'border-line bg-white hover:border-pine/40'
                        }`}
                    >
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${absent ? 'bg-red-100 text-red-700' : 'bg-pine/10 text-pine'}`}>
                        {initials(s.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink">{s.name}</div>
                        <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                                absent ? 'bg-red-600 text-white' : 'bg-pine text-white'
                            }`}
                        >
                    {absent ? 'Absent' : 'Present'}
                  </span>
                      </div>
                    </button>
                );
              })}
            </div>
        ) : (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">
              {students.length ? 'No students match your search.' : 'No learners are assigned to this batch.'}
            </div>
        )}

        <div className="sticky bottom-4 mt-6 flex justify-end">
          <button
              disabled={!students.length || isSubmitting}
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-full bg-pine px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check size={17} />
            {isSubmitting ? 'Saving…' : existingSessionId ? 'Update attendance' : 'Submit attendance'}
          </button>
        </div>

        <section className="mt-8 overflow-hidden rounded-xl border border-line bg-white">
          <div className="border-b border-line bg-paper px-5 py-3 font-display font-semibold">Recent attendance sessions</div>
          {recentSessions.length ? recentSessions.map((s) => (
              <div key={s.id} className="grid grid-cols-[1fr_1fr_120px] gap-4 border-b border-line px-5 py-4 last:border-0 text-sm">
                <span className="font-semibold">{s.bst?.subject?.name ?? '—'} · {s.bst?.batch?.name ?? '—'}</span>
                <span className="text-ink-soft">{s.sessionDate.slice(0, 10)}</span>
                <span className="text-pine font-semibold">{s.summary ? `${s.summary.present}/${s.summary.total} present` : '—'}</span>
              </div>
          )) : <div className="px-5 py-8 text-center text-sm text-ink-soft">No attendance sessions yet.</div>}
        </section>
      </div>
  );
}

// ---------------------------------------------------------------------------
// Student: personal read-only view — Subject-wise / Log / Monthly / Overall
// ---------------------------------------------------------------------------

type Tab = 'subject' | 'log' | 'monthly' | 'overall';

function StudentAttendanceView() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('subject');

  const [logFilter, setLogFilter] = useState<'absent' | 'present' | 'both'>('both');
  const [logSubject, setLogSubject] = useState('all');

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiFetch<AttendanceSession[]>('/api/attendance');
        setSessions(data);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load your attendance.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const withStatus = sessions.filter((s) => s.myRecord);

  const subjectStats = useMemo(() => {
    const bySubject = new Map<string, { total: number; present: number }>();
    for (const s of withStatus) {
      const name = s.bst?.subject?.name ?? 'Unknown';
      const entry = bySubject.get(name) ?? { total: 0, present: 0 };
      entry.total += 1;
      if (s.myRecord?.status === 'present') entry.present += 1;
      bySubject.set(name, entry);
    }
    return [...bySubject.entries()]
        .map(([name, { total, present }]) => ({ name, total, present, percent: total ? (present / total) * 100 : 0 }))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [withStatus]);

  const subjectNames = useMemo(() => [...new Set(withStatus.map((s) => s.bst?.subject?.name ?? 'Unknown'))].sort(), [withStatus]);

  const logRows = useMemo(() => {
    return withStatus
        .filter((s) => logFilter === 'both' || s.myRecord?.status === logFilter)
        .filter((s) => logSubject === 'all' || s.bst?.subject?.name === logSubject)
        .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
  }, [withStatus, logFilter, logSubject]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyStats = useMemo(() => {
    const inMonth = withStatus.filter((s) => {
      const d = new Date(s.sessionDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const present = inMonth.filter((s) => s.myRecord?.status === 'present').length;
    return { total: inMonth.length, present, percent: inMonth.length ? (present / inMonth.length) * 100 : 0 };
  }, [withStatus, currentMonth, currentYear]);

  const overallStats = useMemo(() => {
    const present = withStatus.filter((s) => s.myRecord?.status === 'present').length;
    return { total: withStatus.length, present, percent: withStatus.length ? (present / withStatus.length) * 100 : 0 };
  }, [withStatus]);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'subject', label: 'Subject-wise' },
    { key: 'log', label: 'Log' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'overall', label: 'Overall' },
  ];

  return (
      <div className="max-w-[900px]">
        <DashboardHeader title="Attendance" />

        {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        <div className="mb-5 flex gap-1 rounded-lg border border-line bg-white p-1 w-fit">
          {TABS.map((t) => (
              <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                      tab === t.key ? 'bg-pine text-white' : 'text-ink-soft hover:bg-paper'
                  }`}
              >
                {t.label}
              </button>
          ))}
        </div>

        {isLoading ? (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">Loading attendance…</div>
        ) : !withStatus.length ? (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">No attendance has been recorded for you yet.</div>
        ) : (
            <>
              {tab === 'subject' && (
                  <div className="rounded-xl border border-line bg-white p-6 space-y-4">
                    {subjectStats.map((s) => (
                        <div key={s.name}>
                          <div className="mb-1.5 flex justify-between text-sm">
                            <span className="font-semibold text-ink">{s.name}</span>
                            <span className="text-ink-soft">{s.percent.toFixed(0)}% ({s.present}/{s.total})</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-line">
                            <div
                                className={`h-full rounded-full ${s.percent >= 75 ? 'bg-pine' : 'bg-saffron-deep'}`}
                                style={{ width: `${s.percent}%` }}
                            />
                          </div>
                        </div>
                    ))}
                  </div>
              )}

              {tab === 'log' && (
                  <div className="rounded-xl border border-line bg-white p-6">
                    <div className="mb-5 flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-3 text-sm">
                        {(['absent', 'present', 'both'] as const).map((f) => (
                            <label key={f} className="flex items-center gap-1.5 capitalize">
                              <input type="radio" checked={logFilter === f} onChange={() => setLogFilter(f)} />
                              {f}
                            </label>
                        ))}
                      </div>
                      <select value={logSubject} onChange={(e) => setLogSubject(e.target.value)} className="ml-auto rounded-md border border-line bg-white px-3 py-1.5 text-sm">
                        <option value="all">All subjects</option>
                        {subjectNames.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="divide-y divide-line">
                      {logRows.length ? logRows.map((s) => (
                          <div key={s.id} className="flex items-center justify-between py-3 text-sm">
                            <div>
                              <div className="font-semibold text-ink">{s.sessionDate.slice(0, 10)}</div>
                              <div className="text-xs text-ink-soft">{s.bst?.subject?.name ?? '—'}</div>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${s.myRecord?.status === 'present' ? 'bg-pine/10 text-pine' : 'bg-red-100 text-red-700'}`}>
                      {s.myRecord?.status}
                    </span>
                          </div>
                      )) : <p className="py-8 text-center text-sm text-ink-soft">No matching records.</p>}
                    </div>
                  </div>
              )}

              {tab === 'monthly' && (
                  <div className="flex items-center gap-8 rounded-xl border border-line bg-white p-8">
                    <CircularProgress percent={monthlyStats.percent} />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-8"><span className="text-ink-soft">Current month attendance</span><strong>{monthlyStats.percent.toFixed(0)}%</strong></div>
                      <div className="flex justify-between gap-8"><span className="text-ink-soft">Sessions present</span><strong>{monthlyStats.present}/{monthlyStats.total}</strong></div>
                      <div className="flex justify-between gap-8"><span className="text-ink-soft">Month</span><strong>{now.toLocaleString('default', { month: 'long', year: 'numeric' })}</strong></div>
                    </div>
                  </div>
              )}

              {tab === 'overall' && (
                  <div className="flex items-center gap-8 rounded-xl border border-line bg-white p-8">
                    <CircularProgress percent={overallStats.percent} />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-8"><span className="text-ink-soft">Overall percentage</span><strong>{overallStats.percent.toFixed(0)}%</strong></div>
                      <div className="flex justify-between gap-8"><span className="text-ink-soft">Sessions present</span><strong>{overallStats.present}/{overallStats.total}</strong></div>
                    </div>
                  </div>
              )}
            </>
        )}
      </div>
  );
}

export default function AttendancePage() {
  const { user } = useAuth();
  if (user?.role === 'student') return <StudentAttendanceView />;
  if (user?.role === 'parent') return <ParentAttendanceView />;
  return <TeacherAttendanceView />;
}

// ---------------------------------------------------------------------------
// Parent: read-only view per linked child — same Subject-wise / Log /
// Monthly / Overall tabs as the student view, with a child selector when a
// parent has more than one linked student. Sessions and their `records`
// arrays are already scoped to the parent's own children server-side (see
// hideRecordsExceptChildren in src/app/api/attendance/route.ts); this view
// picks out the currently-selected child's record from that array the same
// way a student's view already picks out `myRecord`.
// ---------------------------------------------------------------------------

interface LinkedChild { student: { id: string; name: string; batch: { name: string } | null } }

function ParentAttendanceView() {
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('subject');

  const [logFilter, setLogFilter] = useState<'absent' | 'present' | 'both'>('both');
  const [logSubject, setLogSubject] = useState('all');

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [childData, sessionData] = await Promise.all([
          apiFetch<LinkedChild[]>('/api/parent-dashboard'),
          apiFetch<AttendanceSession[]>('/api/attendance'),
        ]);
        setChildren(childData);
        if (childData.length) setSelectedChildId(childData[0].student.id);
        setSessions(sessionData);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load attendance.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Pick out the selected child's own record from each session's (already
  // parent-scoped) records array, mirroring the student view's `myRecord`.
  const withStatus = useMemo(() => {
    return sessions
        .map((s) => ({ ...s, myRecord: s.records.find((r) => r.studentId === selectedChildId) ?? null }))
        .filter((s) => s.myRecord);
  }, [sessions, selectedChildId]);

  const subjectStats = useMemo(() => {
    const bySubject = new Map<string, { total: number; present: number }>();
    for (const s of withStatus) {
      const name = s.bst?.subject?.name ?? 'Unknown';
      const entry = bySubject.get(name) ?? { total: 0, present: 0 };
      entry.total += 1;
      if (s.myRecord?.status === 'present') entry.present += 1;
      bySubject.set(name, entry);
    }
    return [...bySubject.entries()]
        .map(([name, { total, present }]) => ({ name, total, present, percent: total ? (present / total) * 100 : 0 }))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [withStatus]);

  const subjectNames = useMemo(() => [...new Set(withStatus.map((s) => s.bst?.subject?.name ?? 'Unknown'))].sort(), [withStatus]);

  const logRows = useMemo(() => {
    return withStatus
        .filter((s) => logFilter === 'both' || s.myRecord?.status === logFilter)
        .filter((s) => logSubject === 'all' || s.bst?.subject?.name === logSubject)
        .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
  }, [withStatus, logFilter, logSubject]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyStats = useMemo(() => {
    const inMonth = withStatus.filter((s) => {
      const d = new Date(s.sessionDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const present = inMonth.filter((s) => s.myRecord?.status === 'present').length;
    return { total: inMonth.length, present, percent: inMonth.length ? (present / inMonth.length) * 100 : 0 };
  }, [withStatus, currentMonth, currentYear]);

  const overallStats = useMemo(() => {
    const present = withStatus.filter((s) => s.myRecord?.status === 'present').length;
    return { total: withStatus.length, present, percent: withStatus.length ? (present / withStatus.length) * 100 : 0 };
  }, [withStatus]);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'subject', label: 'Subject-wise' },
    { key: 'log', label: 'Log' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'overall', label: 'Overall' },
  ];

  return (
      <div className="max-w-[900px]">
        <DashboardHeader title="Attendance" />

        {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        {!isLoading && children.length === 0 ? (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">
              No children have been linked to your account yet. Please ask your institute admin to link your child&apos;s profile to your parent account.
            </div>
        ) : (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                {children.length > 1 && (
                    <select
                        value={selectedChildId}
                        onChange={(e) => setSelectedChildId(e.target.value)}
                        className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold"
                    >
                      {children.map((c) => (
                          <option key={c.student.id} value={c.student.id}>{c.student.name}</option>
                      ))}
                    </select>
                )}
                <div className="flex gap-1 rounded-lg border border-line bg-white p-1 w-fit">
                  {TABS.map((t) => (
                      <button
                          key={t.key}
                          onClick={() => setTab(t.key)}
                          className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                              tab === t.key ? 'bg-pine text-white' : 'text-ink-soft hover:bg-paper'
                          }`}
                      >
                        {t.label}
                      </button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                  <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">Loading attendance…</div>
              ) : !withStatus.length ? (
                  <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">No attendance has been recorded yet.</div>
              ) : (
                  <>
                    {tab === 'subject' && (
                        <div className="rounded-xl border border-line bg-white p-6 space-y-4">
                          {subjectStats.map((s) => (
                              <div key={s.name}>
                                <div className="mb-1.5 flex justify-between text-sm">
                                  <span className="font-semibold text-ink">{s.name}</span>
                                  <span className="text-ink-soft">{s.percent.toFixed(0)}% ({s.present}/{s.total})</span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-line">
                                  <div
                                      className={`h-full rounded-full ${s.percent >= 75 ? 'bg-pine' : 'bg-saffron-deep'}`}
                                      style={{ width: `${s.percent}%` }}
                                  />
                                </div>
                              </div>
                          ))}
                        </div>
                    )}

                    {tab === 'log' && (
                        <div className="rounded-xl border border-line bg-white p-6">
                          <div className="mb-5 flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-3 text-sm">
                              {(['absent', 'present', 'both'] as const).map((f) => (
                                  <label key={f} className="flex items-center gap-1.5 capitalize">
                                    <input type="radio" checked={logFilter === f} onChange={() => setLogFilter(f)} />
                                    {f}
                                  </label>
                              ))}
                            </div>
                            <select value={logSubject} onChange={(e) => setLogSubject(e.target.value)} className="ml-auto rounded-md border border-line bg-white px-3 py-1.5 text-sm">
                              <option value="all">All subjects</option>
                              {subjectNames.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </div>
                          <div className="divide-y divide-line">
                            {logRows.length ? logRows.map((s) => (
                                <div key={s.id} className="flex items-center justify-between py-3 text-sm">
                                  <div>
                                    <div className="font-semibold text-ink">{s.sessionDate.slice(0, 10)}</div>
                                    <div className="text-xs text-ink-soft">{s.bst?.subject?.name ?? '—'}</div>
                                  </div>
                                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${s.myRecord?.status === 'present' ? 'bg-pine/10 text-pine' : 'bg-red-100 text-red-700'}`}>
                            {s.myRecord?.status}
                          </span>
                                </div>
                            )) : <p className="py-8 text-center text-sm text-ink-soft">No matching records.</p>}
                          </div>
                        </div>
                    )}

                    {tab === 'monthly' && (
                        <div className="flex items-center gap-8 rounded-xl border border-line bg-white p-8">
                          <CircularProgress percent={monthlyStats.percent} />
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-8"><span className="text-ink-soft">Current month attendance</span><strong>{monthlyStats.percent.toFixed(0)}%</strong></div>
                            <div className="flex justify-between gap-8"><span className="text-ink-soft">Sessions present</span><strong>{monthlyStats.present}/{monthlyStats.total}</strong></div>
                            <div className="flex justify-between gap-8"><span className="text-ink-soft">Month</span><strong>{now.toLocaleString('default', { month: 'long', year: 'numeric' })}</strong></div>
                          </div>
                        </div>
                    )}

                    {tab === 'overall' && (
                        <div className="flex items-center gap-8 rounded-xl border border-line bg-white p-8">
                          <CircularProgress percent={overallStats.percent} />
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-8"><span className="text-ink-soft">Overall percentage</span><strong>{overallStats.percent.toFixed(0)}%</strong></div>
                            <div className="flex justify-between gap-8"><span className="text-ink-soft">Sessions present</span><strong>{overallStats.present}/{overallStats.total}</strong></div>
                          </div>
                        </div>
                    )}
                  </>
              )}
            </>
        )}
      </div>
  );
}