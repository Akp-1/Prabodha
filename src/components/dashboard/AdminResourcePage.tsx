'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { createRecordId, useInstitutionStore } from './InstitutionStore';

export type ResourceKind = 'batches' | 'subjects' | 'materials' | 'homework' | 'assessments';

const CONFIG: Record<ResourceKind, { title: string; eyebrow: string; description: string; addLabel: string; columns: [string, string, string]; fields: [string, string, string]; placeholders: [string, string, string] }> = {
  batches: { title: 'Batches and sections', eyebrow: 'Academic structure', description: 'Group learners into batches or sections before planning their academic schedule.', addLabel: 'Create batch', columns: ['Batch / section', 'Faculty lead', 'Learners'], fields: ['Batch or section name', 'Faculty lead', 'Learner capacity'], placeholders: ['e.g. Class 11 Science', 'e.g. Dr. Meera Iyer', 'e.g. 40'] },
  subjects: { title: 'Subjects', eyebrow: 'Academic structure', description: 'Create the subjects that faculty can teach and that learners will see in their academic workspace.', addLabel: 'Create subject', columns: ['Subject', 'Code', 'Faculty'], fields: ['Subject name', 'Subject code', 'Faculty member'], placeholders: ['e.g. Mathematics', 'e.g. MAT-11', 'e.g. Dr. Meera Iyer'] },
  materials: { title: 'Study materials', eyebrow: 'Learning workspace', description: 'Keep notes, documents, and useful links organized by the batch and subject they support.', addLabel: 'Publish material', columns: ['Material', 'Subject', 'Batch'], fields: ['Material title', 'Subject', 'Batch or section'], placeholders: ['e.g. Thermodynamics notes', 'e.g. Physics', 'e.g. Class 11 Science'] },
  homework: { title: 'Homework', eyebrow: 'Learning workspace', description: 'Assign work with a clear due date so learners and parents always know what is pending.', addLabel: 'Assign homework', columns: ['Homework', 'Subject', 'Due date'], fields: ['Homework title', 'Subject', 'Due date'], placeholders: ['e.g. Solve exercise 3.1', 'e.g. Mathematics', 'YYYY-MM-DD'] },
  assessments: { title: 'Marks and assessments', eyebrow: 'Academic performance', description: 'Capture assessments and give management a simple, visible view of learner performance.', addLabel: 'Create assessment', columns: ['Assessment', 'Subject', 'Average / maximum'], fields: ['Assessment title', 'Subject', 'Maximum marks'], placeholders: ['e.g. Unit Test 1', 'e.g. Physics', 'e.g. 50'] },
};

type Row = { id: string; values: [string, string, string]; status?: string };

export function AdminResourcePage({ resource }: { resource: ResourceKind }) {
  const { data, update } = useInstitutionStore();
  const config = CONFIG[resource];
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [third, setThird] = useState('');

  const rows: Row[] = useMemo(() => {
    switch (resource) {
      case 'batches': return data.batches.map((item) => ({ id: item.id, values: [item.name, item.lead, `${item.learnerCount} learners`] }));
      case 'subjects': return data.subjects.map((item) => ({ id: item.id, values: [item.name, item.code, item.faculty] }));
      case 'materials': return data.materials.map((item) => ({ id: item.id, values: [item.title, item.subject, item.batch], status: item.type }));
      case 'homework': return data.homework.map((item) => ({ id: item.id, values: [item.title, item.subject, item.dueDate], status: item.status }));
      case 'assessments': return data.assessments.map((item) => ({ id: item.id, values: [item.title, item.subject, `${item.average} / ${item.maximumMarks}`] }));
    }
  }, [data, resource]);

  const filtered = rows.filter((row) => !query || row.values.some((value) => value.toLowerCase().includes(query.toLowerCase())));
  const close = () => { setFirst(''); setSecond(''); setThird(''); setShowForm(false); };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update((current) => {
      if (resource === 'batches') return { ...current, batches: [{ id: createRecordId('batch'), name: first.trim(), lead: second.trim() || 'Unassigned', learnerCount: Number(third) || 0 }, ...current.batches] };
      if (resource === 'subjects') return { ...current, subjects: [{ id: createRecordId('subject'), name: first.trim(), code: second.trim() || 'No code', faculty: third.trim() || 'Unassigned' }, ...current.subjects] };
      if (resource === 'materials') return { ...current, materials: [{ id: createRecordId('material'), title: first.trim(), subject: second.trim() || 'General', batch: third.trim() || 'All learners', type: 'Note', published: 'Just now' }, ...current.materials] };
      if (resource === 'homework') return { ...current, homework: [{ id: createRecordId('homework'), title: first.trim(), subject: second.trim() || 'General', dueDate: third.trim() || 'No due date', batch: 'All learners', status: 'Open' }, ...current.homework] };
      return { ...current, assessments: [{ id: createRecordId('assessment'), title: first.trim(), subject: second.trim() || 'General', maximumMarks: Number(third) || 100, average: 0, date: new Date().toISOString().slice(0, 10) }, ...current.assessments] };
    });
    close();
  };

  return <div className="max-w-[1040px]">
    <div className="flex items-start justify-between gap-6 mb-8"><div><div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">{config.eyebrow}</div><h1 className="font-display font-semibold text-[32px] tracking-tight">{config.title}</h1><p className="text-ink-soft mt-2 max-w-[640px]">{config.description}</p></div><button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep whitespace-nowrap"><Plus size={17} />{config.addLabel}</button></div>
    <div className="flex flex-wrap justify-between items-center gap-4 mb-5"><span className="text-sm text-ink-soft"><strong className="text-ink">{rows.length}</strong> records</span><label className="flex items-center gap-2 w-full sm:w-[280px] rounded-md border border-line bg-white px-3 py-2.5 text-sm"><Search size={16} className="text-ink-soft" /><span className="sr-only">Search records</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records..." className="w-full bg-transparent outline-none placeholder:text-ink-soft" /></label></div>
    <div className="overflow-hidden rounded-xl border border-line bg-white"><div className="grid grid-cols-[1.4fr_1fr_1fr_100px] gap-4 border-b border-line bg-paper px-6 py-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-soft"><span>{config.columns[0]}</span><span>{config.columns[1]}</span><span>{config.columns[2]}</span><span>State</span></div>{filtered.length ? filtered.map((row) => <div key={row.id} className="grid grid-cols-[1.4fr_1fr_1fr_100px] gap-4 items-center border-b border-line px-6 py-4 last:border-b-0 text-sm"><span className="truncate font-semibold text-ink">{row.values[0]}</span><span className="truncate text-ink-soft">{row.values[1]}</span><span className="truncate text-ink-soft">{row.values[2]}</span><span className="font-semibold text-pine">{row.status ?? 'Active'}</span></div>) : <div className="px-6 py-12 text-center text-sm text-ink-soft">No matching records found.</div>}</div>
    {showForm && <div className="fixed inset-0 z-20 flex items-center justify-center bg-pine-deep/35 px-4"><div className="w-full max-w-[500px] rounded-xl border border-line bg-white p-7 shadow-xl"><div className="flex justify-between gap-4 mb-6"><div><div className="font-display text-[22px] font-semibold">{config.addLabel}</div><p className="mt-1 text-sm text-ink-soft">Add this record to the institution workspace.</p></div><button onClick={close} aria-label="Close form" className="p-1.5 text-ink-soft hover:bg-paper rounded-md"><X size={18} /></button></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-semibold text-ink">{config.fields[0]}<input required value={first} onChange={(event) => setFirst(event.target.value)} placeholder={config.placeholders[0]} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" /></label><label className="block text-sm font-semibold text-ink">{config.fields[1]}<input value={second} onChange={(event) => setSecond(event.target.value)} placeholder={config.placeholders[1]} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" /></label><label className="block text-sm font-semibold text-ink">{config.fields[2]}<input value={third} onChange={(event) => setThird(event.target.value)} placeholder={config.placeholders[2]} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" /></label><div className="flex justify-end gap-3 pt-2"><button type="button" onClick={close} className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper">Cancel</button><button className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep">Save record</button></div></form></div></div>}
  </div>;
}
