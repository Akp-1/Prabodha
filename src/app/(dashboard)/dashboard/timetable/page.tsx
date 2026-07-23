'use client';

import { useState } from 'react';
import { CalendarPlus, Clock3, MapPin, X } from 'lucide-react';
import { createRecordId, useInstitutionStore } from '@/components/dashboard/InstitutionStore';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetablePage() {
  const { data, update } = useInstitutionStore();
  const [showForm, setShowForm] = useState(false);
  const [day, setDay] = useState('Monday');
  const [time, setTime] = useState('09:00 - 10:00');
  const [batch, setBatch] = useState(data.batches[0]?.name ?? '');
  const [subject, setSubject] = useState(data.subjects[0]?.name ?? '');
  const [faculty, setFaculty] = useState(data.faculty[0]?.name ?? '');
  const [room, setRoom] = useState('Room 1');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update((current) => ({ ...current, sessions: [...current.sessions, { id: createRecordId('session'), day, time, batch, subject, faculty, room }]}));
    setShowForm(false);
  };

  return <div className="max-w-[1040px]">
    <div className="flex items-start justify-between gap-6 mb-8"><div><div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Academic schedule</div><h1 className="font-display font-semibold text-[32px] tracking-tight">Weekly timetable</h1><p className="text-ink-soft mt-2">Plan each batch, subject, faculty member, and teaching space in one shared weekly schedule.</p></div><button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep whitespace-nowrap"><CalendarPlus size={17} />Add session</button></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{DAYS.map((currentDay) => <section key={currentDay} className="overflow-hidden rounded-xl border border-line bg-white"><div className="border-b border-line bg-paper px-5 py-3 font-display font-semibold">{currentDay}</div><div className="divide-y divide-line">{data.sessions.filter((item) => item.day === currentDay).length ? data.sessions.filter((item) => item.day === currentDay).map((session) => <div key={session.id} className="p-5"><div className="flex justify-between gap-4"><div><div className="font-semibold text-ink">{session.subject}</div><div className="mt-1 text-sm text-ink-soft">{session.batch} · {session.faculty}</div></div><span className="inline-flex items-center gap-1 h-fit text-xs font-semibold text-pine"><Clock3 size={14} />{session.time}</span></div><div className="mt-3 inline-flex items-center gap-1 text-xs text-ink-soft"><MapPin size={13} />{session.room}</div></div>) : <div className="p-5 text-sm text-ink-soft">No sessions planned.</div>}</div></section>)}</div>
    {showForm && <div className="fixed inset-0 z-20 flex items-center justify-center bg-pine-deep/35 px-4"><div className="w-full max-w-[560px] rounded-xl border border-line bg-white p-7 shadow-xl"><div className="flex justify-between gap-4 mb-6"><div><div className="font-display text-[22px] font-semibold">Add timetable session</div><p className="mt-1 text-sm text-ink-soft">Schedule a class for an institution batch.</p></div><button onClick={() => setShowForm(false)} aria-label="Close form" className="p-1.5 text-ink-soft hover:bg-paper rounded-md"><X size={18} /></button></div><form onSubmit={submit} className="grid grid-cols-2 gap-4"><label className="text-sm font-semibold">Day<select value={day} onChange={(event) => setDay(event.target.value)} className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 font-normal">{DAYS.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-sm font-semibold">Time<input value={time} onChange={(event) => setTime(event.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal" /></label><label className="text-sm font-semibold">Batch<select required value={batch} onChange={(event) => setBatch(event.target.value)} className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 font-normal">{data.batches.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-semibold">Subject<select required value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 font-normal">{data.subjects.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-semibold">Faculty<select required value={faculty} onChange={(event) => setFaculty(event.target.value)} className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 font-normal">{data.faculty.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-semibold">Room<input value={room} onChange={(event) => setRoom(event.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal" /></label><div className="col-span-2 flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold hover:bg-paper">Cancel</button><button className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep">Save session</button></div></form></div></div>}
  </div>;
}
