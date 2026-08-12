'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ClipboardCheck, UserRound } from 'lucide-react';
import { SkeletonList } from '@/components/ui/Skeleton';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/components/auth/AuthProvider';

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
  summary?: { total: number; present: number; absent: number };
  bst?: { batch: { name: string }; subject: { name: string } };
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentId, setAssignmentId] = useState('');
  const [date, setDate] = useState(todayISO());

  const [students, setStudents] = useState<Student[]>([]);
  const [absentIds, setAbsentIds] = useState<string[]>([]);
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);

  const [recentSessions, setRecentSessions] = useState<AttendanceSession[]>([]);

  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAssignment = assignments.find((a) => a.id === assignmentId) ?? null;
  const present = students.length - absentIds.length;

  // Load this teacher's assignments once (GET /api/assignments is already
  // scoped to the logged-in teacher — admins would see everything, but this
  // page is teacher-facing per the ROADMAP item).
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

  // Whenever the batch/subject/date selection changes, load the roster and
  // check whether today's session already exists — if it does, pre-fill
  // from it instead of starting fresh, since a second POST would 409.
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

        const existing = sessions[0]; // unique per [bst, date], so at most one
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
      // Non-fatal — the recent-sessions list just stays empty.
    }
  }

  useEffect(() => {
    loadRecent();
  }, []);

  function toggle(studentId: string) {
    setAbsentIds((current) => (current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]));
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
        await apiFetch(`/api/attendance/${existingSessionId}`, {
          method: 'PATCH',
          body: JSON.stringify({ records }),
        });
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
      <div className="max-w-[1040px]">
        <div className="mb-8">
          <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Daily operations</div>
          <h1 className="font-display font-semibold text-[32px] tracking-tight">Attendance</h1>
          <p className="text-ink-soft mt-2">Every learner starts as present. Mark absences, then submit one reliable class record.</p>
        </div>

        {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-xl border border-line bg-white overflow-hidden">
            <div className="grid gap-3 border-b border-line bg-paper px-5 py-4 sm:grid-cols-2">
              <label className="text-xs font-semibold">
                Class (batch · subject)
                <select
                    value={assignmentId}
                    onChange={(e) => setAssignmentId(e.target.value)}
                    disabled={isLoadingAssignments || !assignments.length}
                    className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm font-normal"
                >
                  {!assignments.length && <option>No assigned classes</option>}
                  {assignments.map((a) => (
                      <option key={a.id} value={a.id}>{a.batch.name} · {a.subject.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold">
                Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm font-normal" />
              </label>
            </div>

            {existingSessionId && (
                <div className="border-b border-line bg-saffron/10 px-5 py-2.5 text-xs font-semibold text-saffron-deep">
                  Attendance already submitted for this class and date — editing will update the existing record.
                </div>
            )}

            <div className="divide-y divide-line">
              {isLoadingRoster ? (
                  <div className="p-4"><SkeletonList items={4} /></div>
              ) : students.length ? students.map((s) => {
                const absent = absentIds.includes(s.id);
                return (
                    <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pine/10 text-pine"><UserRound size={17} /></div>
                        <div>
                          <div className="font-semibold text-sm">{s.name}</div>
                          <div className="text-xs text-ink-soft">{s.email}</div>
                        </div>
                      </div>
                      <button
                          onClick={() => toggle(s.id)}
                          className={absent ? 'rounded-md border border-saffron bg-saffron/10 px-3 py-2 text-xs font-semibold text-saffron-deep' : 'rounded-md bg-pine px-3 py-2 text-xs font-semibold text-white'}
                      >
                        {absent ? 'Absent' : 'Present'}
                      </button>
                    </div>
                );
              }) : <div className="px-5 py-12 text-center text-sm text-ink-soft">No learners are assigned to this batch.</div>}
            </div>
          </section>

          <aside className="h-fit rounded-xl border border-line bg-white p-6">
            <ClipboardCheck className="text-pine mb-5" size={27} />
            <div className="font-display text-xl font-semibold">{existingSessionId ? 'Update submission' : 'Ready to submit'}</div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-ink-soft">Present</span><strong>{present}</strong></div>
              <div className="flex justify-between"><span className="text-ink-soft">Absent</span><strong>{absentIds.length}</strong></div>
              <div className="flex justify-between"><span className="text-ink-soft">Total learners</span><strong>{students.length}</strong></div>
            </div>
            <button
                disabled={!students.length || isSubmitting}
                onClick={submit}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-pine px-4 py-3 text-sm font-semibold text-white hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={17} />
              {isSubmitting ? 'Saving…' : existingSessionId ? 'Update attendance' : 'Submit attendance'}
            </button>
          </aside>
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