'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Circle, Plus, X } from 'lucide-react';
import { SkeletonList } from '@/components/ui/Skeleton';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/components/auth/AuthProvider';

type StatusEntry = { studentId: string; status: 'pending' | 'completed' };

type Homework = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  batch: { id: string; name: string } | null;
  subject: { id: string; name: string } | null;
  assigner: { id: string; name: string } | null;
  statuses: StatusEntry[];
  summary: { total: number; completed: number; pending: number };
};

type Batch = { id: string; name: string };
type Subject = { id: string; name: string };

function isOverdue(dueDate: string) {
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export default function HomeworkPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const [homework, setHomework] = useState<Homework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchOptions, setBatchOptions] = useState<Batch[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<Subject[]>([]);

  const [title, setTitle] = useState('');
  const [batchId, setBatchId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [dueDate, setDueDate] = useState('');

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<Homework[]>('/api/homework');
      setHomework(data);
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Failed to load homework.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!canManage) return;
    (async () => {
      try {
        const [batches, subjects] = await Promise.all([
          apiFetch<Batch[]>('/api/batches'),
          apiFetch<Subject[]>('/api/subjects'),
        ]);
        setBatchOptions(batches);
        setSubjectOptions(subjects);
      } catch {
        // Non-fatal.
      }
    })();
  }, [canManage]);

  function close() {
    setTitle('');
    setBatchId('');
    setSubjectId('');
    setDueDate('');
    setFormError(null);
    setShowForm(false);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiFetch('/api/homework', {
        method: 'POST',
        body: JSON.stringify({ batchId, subjectId, title: title.trim(), dueDate }),
      });
      close();
      await load();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Failed to assign homework.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Student self-service: toggle their own completion status only.
  async function toggleMine(hw: Homework) {
    if (!user) return;
    const mine = hw.statuses.find((s) => s.studentId === user.id);
    const nextStatus = mine?.status === 'completed' ? 'pending' : 'completed';
    try {
      await apiFetch(`/api/homework/${hw.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ statuses: [{ studentId: user.id, status: nextStatus }] }),
      });
      setHomework((current) =>
          current.map((h) =>
              h.id === hw.id
                  ? { ...h, statuses: h.statuses.map((s) => (s.studentId === user.id ? { ...s, status: nextStatus } : s)) }
                  : h
          )
      );
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Failed to update your status.');
    }
  }

  async function remove(id: string) {
    try {
      await apiFetch(`/api/homework/${id}`, { method: 'DELETE' });
      setHomework((current) => current.filter((h) => h.id !== id));
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Failed to delete this homework.');
    }
  }

  return (
      <div className="max-w-[1040px]">
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Learning workspace</div>
            <h1 className="font-display font-semibold text-[32px] tracking-tight">Homework</h1>
            <p className="text-ink-soft mt-2 max-w-[640px]">
              {canManage ? 'Assign work with a clear due date and track who has completed it.' : 'Everything assigned to your batch, and what you still owe.'}
            </p>
          </div>
          {canManage && (
              <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep whitespace-nowrap">
                <Plus size={17} />
                Assign homework
              </button>
          )}
        </div>

        {loadError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{loadError}</div>}

        {isLoading ? (
            <SkeletonList items={4} />
        ) : homework.length ? (
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <div className="divide-y divide-line">
                {homework.map((hw) => {
                  const mine = user ? hw.statuses.find((s) => s.studentId === user.id) : undefined;
                  const overdue = isOverdue(hw.dueDate);
                  return (
                      <div key={hw.id} className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {isStudent && (
                              <button onClick={() => toggleMine(hw)} aria-label="Toggle completion" className="flex-shrink-0 text-pine">
                                {mine?.status === 'completed' ? <CheckCircle2 size={22} /> : <Circle size={22} className="text-ink-soft" />}
                              </button>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-ink truncate">{hw.title}</div>
                            <div className="text-xs text-ink-soft">
                              {hw.subject?.name ?? '—'} · {hw.batch?.name ?? '—'}
                              {!isStudent && hw.assigner && <> · {hw.assigner.name}</>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                    <span className={overdue && !(mine?.status === 'completed') ? 'inline-flex items-center gap-1 text-xs font-semibold text-red-600' : 'inline-flex items-center gap-1 text-xs font-semibold text-ink-soft'}>
                      <CalendarClock size={13} />
                      Due {hw.dueDate.slice(0, 10)}
                    </span>
                          {canManage && (
                              <span className="text-xs font-semibold text-pine">{hw.summary.completed}/{hw.summary.total} done</span>
                          )}
                          {canManage && (
                              <button onClick={() => remove(hw.id)} className="text-xs font-semibold text-red-600 hover:underline">Delete</button>
                          )}
                        </div>
                      </div>
                  );
                })}
              </div>
            </div>
        ) : (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">
              {canManage ? 'No homework assigned yet.' : 'No homework has been assigned to your batch yet.'}
            </div>
        )}

        {showForm && (
            <div className="fixed inset-0 z-20 flex items-center justify-center bg-pine-deep/35 px-4">
              <div className="w-full max-w-[500px] rounded-xl border border-line bg-white p-7 shadow-xl">
                <div className="flex justify-between gap-4 mb-6">
                  <div>
                    <div className="font-display text-[22px] font-semibold">Assign homework</div>
                    <p className="mt-1 text-sm text-ink-soft">Every active student in the batch gets this on their list.</p>
                  </div>
                  <button onClick={close} aria-label="Close form" className="p-1.5 text-ink-soft hover:bg-paper rounded-md"><X size={18} /></button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                  <label className="block text-sm font-semibold text-ink">
                    Title
                    <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Solve exercise 3.1" className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" />
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block text-sm font-semibold text-ink">
                      Batch
                      <select required value={batchId} onChange={(e) => setBatchId(e.target.value)} className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-pine">
                        <option value="" disabled>Select batch</option>
                        {batchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </label>
                    <label className="block text-sm font-semibold text-ink">
                      Subject
                      <select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-pine">
                        <option value="" disabled>Select subject</option>
                        {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className="block text-sm font-semibold text-ink">
                    Due date
                    <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" />
                  </label>

                  {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={close} className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper">Cancel</button>
                    <button disabled={isSubmitting} className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-50">{isSubmitting ? 'Saving…' : 'Assign'}</button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  );
}