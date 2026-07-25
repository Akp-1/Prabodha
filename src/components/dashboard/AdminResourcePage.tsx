'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { createRecordId, useInstitutionStore } from './InstitutionStore';

export type ResourceKind = 'batches' | 'subjects' | 'materials' | 'homework' | 'assessments';

const CONFIG: Record<ResourceKind, { title: string; eyebrow: string; description: string; addLabel: string; columns: [string, string, string]; fields: [string, string, string]; placeholders: [string, string, string] }> = {
  batches: { title: 'Batches and sections', eyebrow: 'Academic structure', description: 'Group learners into batches or sections before planning their academic schedule.', addLabel: 'Create batch', columns: ['Batch / section', 'Created', 'ID'], fields: ['Batch or section name', '', ''], placeholders: ['e.g. Class 11 Science', '', ''] },
  subjects: { title: 'Subjects', eyebrow: 'Academic structure', description: 'Create the subjects that faculty can teach and that learners will see in their academic workspace.', addLabel: 'Create subject', columns: ['Subject', 'Created', 'ID'], fields: ['Subject name', '', ''], placeholders: ['e.g. Mathematics', '', ''] },
  materials: { title: 'Study materials', eyebrow: 'Learning workspace', description: 'Keep notes, documents, and useful links organized by the batch and subject they support.', addLabel: 'Publish material', columns: ['Material', 'Subject', 'Batch'], fields: ['Material title', 'Subject', 'Batch or section'], placeholders: ['e.g. Thermodynamics notes', 'e.g. Physics', 'e.g. Class 11 Science'] },
  homework: { title: 'Homework', eyebrow: 'Learning workspace', description: 'Assign work with a clear due date so learners and parents always know what is pending.', addLabel: 'Assign homework', columns: ['Homework', 'Subject', 'Due date'], fields: ['Homework title', 'Subject', 'Due date'], placeholders: ['e.g. Solve exercise 3.1', 'e.g. Mathematics', 'YYYY-MM-DD'] },
  assessments: { title: 'Marks and assessments', eyebrow: 'Academic performance', description: 'Capture assessments and give management a simple, visible view of learner performance.', addLabel: 'Create assessment', columns: ['Assessment', 'Subject', 'Average / maximum'], fields: ['Assessment title', 'Subject', 'Maximum marks'], placeholders: ['e.g. Unit Test 1', 'e.g. Physics', 'e.g. 50'] },
};

// Resources that have live APIs
const API_RESOURCES: ResourceKind[] = ['batches', 'subjects'];

type Row = { id: string; values: [string, string, string]; status?: string };

type ApiBatch = { id: string; name: string; createdAt: string; _count?: { students: number } };
type ApiSubject = { id: string; name: string; createdAt: string };

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function AdminResourcePage({ resource }: { resource: ResourceKind }) {
  const usesApi = API_RESOURCES.includes(resource);
  // Only use InstitutionStore for non-API resources
  const store = usesApi ? null : useInstitutionStore(); // eslint-disable-line react-hooks/rules-of-hooks
  const config = CONFIG[resource];
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [third, setThird] = useState('');
  const [apiRows, setApiRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(usesApi);

  // Fetch from API for batches/subjects
  useEffect(() => {
    if (!usesApi) return;
    async function fetchData() {
      try {
        if (resource === 'batches') {
          const batches = await apiFetch<ApiBatch[]>('/api/batches');
          setApiRows(batches.map((b) => ({
            id: b.id,
            values: [b.name, formatDate(b.createdAt), b.id.slice(0, 8)],
          })));
        } else if (resource === 'subjects') {
          const subjects = await apiFetch<ApiSubject[]>('/api/subjects');
          setApiRows(subjects.map((s) => ({
            id: s.id,
            values: [s.name, formatDate(s.createdAt), s.id.slice(0, 8)],
          })));
        }
      } catch {
        // API not available — leave empty
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [resource, usesApi]);

  // Rows from InstitutionStore (for materials/homework/assessments)
  const storeRows: Row[] = useMemo(() => {
    if (usesApi || !store) return [];
    const data = store.data;
    switch (resource) {
      case 'materials': return data.materials.map((item) => ({ id: item.id, values: [item.title, item.subject, item.batch], status: item.type }));
      case 'homework': return data.homework.map((item) => ({ id: item.id, values: [item.title, item.subject, item.dueDate], status: item.status }));
      case 'assessments': return data.assessments.map((item) => ({ id: item.id, values: [item.title, item.subject, `${item.average} / ${item.maximumMarks}`] }));
      default: return [];
    }
  }, [store?.data, resource, usesApi, store]);

  const rows = usesApi ? apiRows : storeRows;
  const filtered = rows.filter((row) => !query || row.values.some((value) => value.toLowerCase().includes(query.toLowerCase())));
  const close = () => { setFirst(''); setSecond(''); setThird(''); setShowForm(false); };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (usesApi) {
      // POST to real API
      try {
        const endpoint = `/api/${resource}`;
        const created = await apiFetch<ApiBatch | ApiSubject>(endpoint, {
          method: 'POST',
          body: JSON.stringify({ name: first.trim() }),
        });
        const newRow: Row = {
          id: created.id,
          values: [created.name, formatDate(created.createdAt), created.id.slice(0, 8)],
        };
        setApiRows((current) => [newRow, ...current]);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to create record');
      }
    } else if (store) {
      // Fall back to InstitutionStore for non-API resources
      store.update((current) => {
        if (resource === 'materials') return { ...current, materials: [{ id: createRecordId('material'), title: first.trim(), subject: second.trim() || 'General', batch: third.trim() || 'All learners', type: 'Note', published: 'Just now' }, ...current.materials] };
        if (resource === 'homework') return { ...current, homework: [{ id: createRecordId('homework'), title: first.trim(), subject: second.trim() || 'General', dueDate: third.trim() || 'No due date', batch: 'All learners', status: 'Open' }, ...current.homework] };
        return { ...current, assessments: [{ id: createRecordId('assessment'), title: first.trim(), subject: second.trim() || 'General', maximumMarks: Number(third) || 100, average: 0, date: new Date().toISOString().slice(0, 10) }, ...current.assessments] };
      });
    }
    close();
  };

  if (loading) {
    return (
      <div className="max-w-[1040px]">
        <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">{config.eyebrow}</div>
        <h1 className="font-display font-semibold text-[32px] tracking-tight mb-6">{config.title}</h1>
        <div className="text-sm text-ink-soft">Loading…</div>
      </div>
    );
  }

  return <div className="max-w-[1040px]">
    <div className="flex items-start justify-between gap-6 mb-8"><div><div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">{config.eyebrow}</div><h1 className="font-display font-semibold text-[32px] tracking-tight">{config.title}</h1><p className="text-ink-soft mt-2 max-w-[640px]">{config.description}</p></div><button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep whitespace-nowrap"><Plus size={17} />{config.addLabel}</button></div>
    <div className="flex flex-wrap justify-between items-center gap-4 mb-5"><span className="text-sm text-ink-soft"><strong className="text-ink">{rows.length}</strong> records</span><label className="flex items-center gap-2 w-full sm:w-[280px] rounded-md border border-line bg-white px-3 py-2.5 text-sm"><Search size={16} className="text-ink-soft" /><span className="sr-only">Search records</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records..." className="w-full bg-transparent outline-none placeholder:text-ink-soft" /></label></div>
    <div className="overflow-hidden rounded-xl border border-line bg-white"><div className="grid grid-cols-[1.4fr_1fr_1fr_100px] gap-4 border-b border-line bg-paper px-6 py-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-soft"><span>{config.columns[0]}</span><span>{config.columns[1]}</span><span>{config.columns[2]}</span><span>State</span></div>{filtered.length ? filtered.map((row) => <div key={row.id} className="grid grid-cols-[1.4fr_1fr_1fr_100px] gap-4 items-center border-b border-line px-6 py-4 last:border-b-0 text-sm"><span className="truncate font-semibold text-ink">{row.values[0]}</span><span className="truncate text-ink-soft">{row.values[1]}</span><span className="truncate text-ink-soft">{row.values[2]}</span><span className="font-semibold text-pine">{row.status ?? 'Active'}</span></div>) : <div className="px-6 py-12 text-center text-sm text-ink-soft">No matching records found.</div>}</div>
    {showForm && <div className="fixed inset-0 z-20 flex items-center justify-center bg-pine-deep/35 px-4"><div className="w-full max-w-[500px] rounded-xl border border-line bg-white p-7 shadow-xl"><div className="flex justify-between gap-4 mb-6"><div><div className="font-display text-[22px] font-semibold">{config.addLabel}</div><p className="mt-1 text-sm text-ink-soft">Add this record to the institution workspace.</p></div><button onClick={close} aria-label="Close form" className="p-1.5 text-ink-soft hover:bg-paper rounded-md"><X size={18} /></button></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-semibold text-ink">{config.fields[0]}<input required value={first} onChange={(event) => setFirst(event.target.value)} placeholder={config.placeholders[0]} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" /></label>{!usesApi && <><label className="block text-sm font-semibold text-ink">{config.fields[1]}<input value={second} onChange={(event) => setSecond(event.target.value)} placeholder={config.placeholders[1]} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" /></label><label className="block text-sm font-semibold text-ink">{config.fields[2]}<input value={third} onChange={(event) => setThird(event.target.value)} placeholder={config.placeholders[2]} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" /></label></>}<div className="flex justify-end gap-3 pt-2"><button type="button" onClick={close} className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper">Cancel</button><button className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep">Save record</button></div></form></div></div>}
  </div>;
}
