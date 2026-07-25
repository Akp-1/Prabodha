'use client';

import { useEffect, useState } from 'react';
import { CalendarPlus, Clock3, MapPin, X } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS = [1, 2, 3, 4, 5, 6]; // Mon-Sat for display grid

type TimetableSlot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classroom?: string | null;
  bst: {
    batch: { id: string; name: string };
    subject: { id: string; name: string };
    teacher: { id: string; name: string; email: string };
  };
};

type Assignment = {
  id: string;
  batch: { id: string; name: string };
  subject: { id: string; name: string };
  teacher: { id: string; name: string };
};

export default function TimetablePage() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday default
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [classroom, setClassroom] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [slotsData, assignmentsData] = await Promise.all([
          apiFetch<TimetableSlot[]>('/api/timetable').catch(() => []),
          apiFetch<Assignment[]>('/api/assignments').catch(() => []),
        ]);
        setSlots(Array.isArray(slotsData) ? slotsData : []);
        setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
        if (Array.isArray(assignmentsData) && assignmentsData.length > 0) {
          setSelectedAssignment(assignmentsData[0].id);
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const created = await apiFetch<TimetableSlot>('/api/timetable', {
        method: 'POST',
        body: JSON.stringify({
          batchSubjectTeacherId: selectedAssignment,
          dayOfWeek,
          startTime,
          endTime,
          classroom: classroom.trim() || undefined,
        }),
      });
      setSlots((current) => [...current, created]);
      setShowForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create session');
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1040px]">
        <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Academic schedule</div>
        <h1 className="font-display font-semibold text-[32px] tracking-tight mb-6">Weekly timetable</h1>
        <div className="text-sm text-ink-soft">Loading…</div>
      </div>
    );
  }

  return <div className="max-w-[1040px]">
    <div className="flex items-start justify-between gap-6 mb-8"><div><div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Academic schedule</div><h1 className="font-display font-semibold text-[32px] tracking-tight">Weekly timetable</h1><p className="text-ink-soft mt-2">Plan each batch, subject, faculty member, and teaching space in one shared weekly schedule.</p></div><button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep whitespace-nowrap"><CalendarPlus size={17} />Add session</button></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{WEEKDAYS.map((dayIndex) => <section key={dayIndex} className="overflow-hidden rounded-xl border border-line bg-white"><div className="border-b border-line bg-paper px-5 py-3 font-display font-semibold">{DAYS[dayIndex]}</div><div className="divide-y divide-line">{slots.filter((s) => s.dayOfWeek === dayIndex).length ? slots.filter((s) => s.dayOfWeek === dayIndex).map((slot) => <div key={slot.id} className="p-5"><div className="flex justify-between gap-4"><div><div className="font-semibold text-ink">{slot.bst.subject.name}</div><div className="mt-1 text-sm text-ink-soft">{slot.bst.batch.name} · {slot.bst.teacher.name}</div></div><span className="inline-flex items-center gap-1 h-fit text-xs font-semibold text-pine"><Clock3 size={14} />{slot.startTime} – {slot.endTime}</span></div>{slot.classroom && <div className="mt-3 inline-flex items-center gap-1 text-xs text-ink-soft"><MapPin size={13} />{slot.classroom}</div>}</div>) : <div className="p-5 text-sm text-ink-soft">No sessions planned.</div>}</div></section>)}</div>
    {showForm && <div className="fixed inset-0 z-20 flex items-center justify-center bg-pine-deep/35 px-4"><div className="w-full max-w-[560px] rounded-xl border border-line bg-white p-7 shadow-xl"><div className="flex justify-between gap-4 mb-6"><div><div className="font-display text-[22px] font-semibold">Add timetable session</div><p className="mt-1 text-sm text-ink-soft">Schedule a class using an existing batch–subject–teacher assignment.</p></div><button onClick={() => setShowForm(false)} aria-label="Close form" className="p-1.5 text-ink-soft hover:bg-paper rounded-md"><X size={18} /></button></div><form onSubmit={submit} className="grid grid-cols-2 gap-4">
      <label className="col-span-2 text-sm font-semibold">Assignment<select required value={selectedAssignment} onChange={(e) => setSelectedAssignment(e.target.value)} className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 font-normal">{assignments.length ? assignments.map((a) => <option key={a.id} value={a.id}>{a.subject.name} → {a.batch.name} ({a.teacher.name})</option>) : <option value="">No assignments found</option>}</select></label>
      <label className="text-sm font-semibold">Day<select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 font-normal">{WEEKDAYS.map((d) => <option key={d} value={d}>{DAYS[d]}</option>)}</select></label>
      <label className="text-sm font-semibold">Classroom<input value={classroom} onChange={(e) => setClassroom(e.target.value)} placeholder="e.g. Room 1" className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal" /></label>
      <label className="text-sm font-semibold">Start time<input required type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal" /></label>
      <label className="text-sm font-semibold">End time<input required type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal" /></label>
      <div className="col-span-2 flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold hover:bg-paper">Cancel</button><button className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep">Save session</button></div>
    </form></div></div>}
  </div>;
}
