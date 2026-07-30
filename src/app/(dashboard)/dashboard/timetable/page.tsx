'use client';

import { useEffect, useState } from 'react';
import { CalendarPlus, Clock3, MapPin, X } from 'lucide-react';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/components/auth/AuthProvider';

// dayOfWeek is stored as a JS-style integer (0 = Sunday ... 6 = Saturday).
// The UI only offers Monday–Saturday, matching the original design, but the
// mapping below is what actually gets sent to the API.
const DAYS: { label: string; value: number }[] = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

type Assignment = { id: string; batch: { id: string; name: string }; subject: { id: string; name: string }; teacher: { id: string; name: string } };

type Slot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classroom: string | null;
  bst: { batch: { name: string }; subject: { name: string }; teacher: { name: string } } | null;
};

export default function TimetablePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [assignmentId, setAssignmentId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(DAYS[0].value);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [classroom, setClassroom] = useState('');

  async function loadSlots() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<Slot[]>('/api/timetable');
      setSlots(data);
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Failed to load the timetable.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSlots();
  }, []);

  // Assignment picker only needed for admins building the schedule.
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const data = await apiFetch<Assignment[]>('/api/assignments');
        setAssignments(data);
        if (data.length) setAssignmentId(data[0].id);
      } catch {
        // Non-fatal — the picker just renders empty.
      }
    })();
  }, [isAdmin]);

  function close() {
    setDayOfWeek(DAYS[0].value);
    setStartTime('09:00');
    setEndTime('10:00');
    setClassroom('');
    setFormError(null);
    setShowForm(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiFetch('/api/timetable', {
        method: 'POST',
        body: JSON.stringify({
          batchSubjectTeacherId: assignmentId,
          dayOfWeek,
          startTime,
          endTime,
          classroom: classroom.trim() || undefined,
        }),
      });
      close();
      await loadSlots();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Failed to save this session.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
      <div className="max-w-[1040px]">
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Academic schedule</div>
            <h1 className="font-display font-semibold text-[32px] tracking-tight">Weekly timetable</h1>
            <p className="text-ink-soft mt-2">Plan each batch, subject, faculty member, and teaching space in one shared weekly schedule.</p>
          </div>
          {isAdmin && (
              <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep whitespace-nowrap">
                <CalendarPlus size={17} />
                Add session
              </button>
          )}
        </div>

        {loadError && <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{loadError}</div>}

        {isLoading ? (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">Loading timetable…</div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {DAYS.map((day) => {
                const daySlots = slots.filter((s) => s.dayOfWeek === day.value).sort((a, b) => a.startTime.localeCompare(b.startTime));
                return (
                    <section key={day.value} className="overflow-hidden rounded-xl border border-line bg-white">
                      <div className="border-b border-line bg-paper px-5 py-3 font-display font-semibold">{day.label}</div>
                      <div className="divide-y divide-line">
                        {daySlots.length ? daySlots.map((slot) => (
                            <div key={slot.id} className="p-5">
                              <div className="flex justify-between gap-4">
                                <div>
                                  <div className="font-semibold text-ink">{slot.bst?.subject?.name ?? '—'}</div>
                                  <div className="mt-1 text-sm text-ink-soft">{slot.bst?.batch?.name ?? '—'} · {slot.bst?.teacher?.name ?? '—'}</div>
                                </div>
                                <span className="inline-flex items-center gap-1 h-fit text-xs font-semibold text-pine">
                          <Clock3 size={14} />
                                  {slot.startTime} - {slot.endTime}
                        </span>
                              </div>
                              {slot.classroom && (
                                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-ink-soft">
                                    <MapPin size={13} />
                                    {slot.classroom}
                                  </div>
                              )}
                            </div>
                        )) : <div className="p-5 text-sm text-ink-soft">No sessions planned.</div>}
                      </div>
                    </section>
                );
              })}
            </div>
        )}

        {showForm && (
            <div className="fixed inset-0 z-20 flex items-center justify-center bg-pine-deep/35 px-4">
              <div className="w-full max-w-[560px] rounded-xl border border-line bg-white p-7 shadow-xl">
                <div className="flex justify-between gap-4 mb-6">
                  <div>
                    <div className="font-display text-[22px] font-semibold">Add timetable session</div>
                    <p className="mt-1 text-sm text-ink-soft">Schedule a class for an institution batch.</p>
                  </div>
                  <button onClick={close} aria-label="Close form" className="p-1.5 text-ink-soft hover:bg-paper rounded-md"><X size={18} /></button>
                </div>
                <form onSubmit={submit} className="grid grid-cols-2 gap-4">
                  <label className="text-sm font-semibold col-span-2">
                    Batch · Subject · Teacher
                    <select required value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 font-normal">
                      {!assignments.length && <option value="">No assignments yet — create one first</option>}
                      {assignments.map((a) => (
                          <option key={a.id} value={a.id}>{a.batch.name} · {a.subject.name} · {a.teacher.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">
                    Day
                    <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 font-normal">
                      {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">
                    Room
                    <input value={classroom} onChange={(e) => setClassroom(e.target.value)} placeholder="e.g. Room 1" className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal" />
                  </label>
                  <label className="text-sm font-semibold">
                    Start time
                    <input required type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal" />
                  </label>
                  <label className="text-sm font-semibold">
                    End time
                    <input required type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal" />
                  </label>

                  {formError && <div className="col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}

                  <div className="col-span-2 flex justify-end gap-3 pt-2">
                    <button type="button" onClick={close} className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold hover:bg-paper">Cancel</button>
                    <button disabled={isSubmitting || !assignments.length} className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-50">{isSubmitting ? 'Saving…' : 'Save session'}</button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  );
}
