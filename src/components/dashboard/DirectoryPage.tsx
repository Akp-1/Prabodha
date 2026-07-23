'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, UserRound, X } from 'lucide-react';
import { createRecordId, useInstitutionStore } from './InstitutionStore';

export type DirectoryRecord = {
  id: string;
  name: string;
  email: string;
  detail: string;
  status: 'Active' | 'Pending';
};

type DirectoryPageProps = {
  kind: 'Learners' | 'Faculty';
  description: string;
  addLabel: string;
  detailLabel: string;
  detailPlaceholder: string;
};

export function DirectoryPage({ kind, description, addLabel, detailLabel, detailPlaceholder }: DirectoryPageProps) {
  const { data, update } = useInstitutionStore();
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [detail, setDetail] = useState('');

  const records: DirectoryRecord[] = kind === 'Learners'
    ? data.learners.map((learner) => ({ id: learner.id, name: learner.name, email: learner.email, detail: learner.section, status: learner.status }))
    : data.faculty.map((member) => ({ id: member.id, name: member.name, email: member.email, detail: member.subject, status: member.status }));

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return records;
    return records.filter((record) => [record.name, record.email, record.detail].some((value) => value.toLowerCase().includes(normalizedQuery)));
  }, [query, records]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setDetail('');
    setShowForm(false);
  };

  const addRecord = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (kind === 'Learners') {
      update((current) => ({
        ...current,
        learners: [{ id: createRecordId('learner'), name: name.trim(), email: email.trim(), section: detail.trim() || 'Unassigned', parentName: 'Not added', status: 'Pending' }, ...current.learners],
      }));
    } else {
      update((current) => ({
        ...current,
        faculty: [{ id: createRecordId('faculty'), name: name.trim(), email: email.trim(), subject: detail.trim() || 'Unassigned', status: 'Pending' }, ...current.faculty],
      }));
    }
    resetForm();
  };

  return (
    <div className="max-w-[1040px]">
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Institution directory</div>
          <h1 className="font-display font-semibold text-[32px] tracking-tight">{kind}</h1>
          <p className="text-ink-soft mt-2 max-w-[620px]">{description}</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep transition-colors whitespace-nowrap">
          <Plus size={17} />
          {addLabel}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="text-sm text-ink-soft"><span className="font-semibold text-ink">{records.length}</span> total records</div>
        <label className="flex items-center gap-2 w-full sm:w-[280px] rounded-md border border-line bg-white px-3 py-2.5 text-sm">
          <Search size={16} className="text-ink-soft" />
          <span className="sr-only">Search {kind.toLowerCase()}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${kind.toLowerCase()}...`} className="w-full bg-transparent outline-none placeholder:text-ink-soft" />
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="grid grid-cols-[minmax(180px,1.4fr)_minmax(180px,1fr)_minmax(140px,0.8fr)_100px] gap-4 border-b border-line bg-paper px-6 py-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-soft">
          <span>Name</span><span>Email</span><span>{detailLabel}</span><span>Status</span>
        </div>
        {filteredRecords.length > 0 ? filteredRecords.map((record) => (
          <div key={record.id} className="grid grid-cols-[minmax(180px,1.4fr)_minmax(180px,1fr)_minmax(140px,0.8fr)_100px] gap-4 items-center border-b border-line px-6 py-4 last:border-b-0 text-sm">
            <div className="flex items-center gap-3 min-w-0"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine/10 text-pine"><UserRound size={17} /></div><span className="truncate font-semibold text-ink">{record.name}</span></div>
            <span className="truncate text-ink-soft">{record.email}</span><span className="truncate text-ink-soft">{record.detail}</span>
            <span className={record.status === 'Active' ? 'text-pine font-semibold' : 'text-saffron-deep font-semibold'}>{record.status}</span>
          </div>
        )) : <div className="px-6 py-12 text-center text-sm text-ink-soft">No matching records found.</div>}
      </div>

      {showForm && <div className="fixed inset-0 z-20 flex items-center justify-center bg-pine-deep/35 px-4">
        <div className="w-full max-w-[500px] rounded-xl border border-line bg-white p-7 shadow-xl">
          <div className="flex items-start justify-between gap-4 mb-6"><div><div className="font-display text-[22px] font-semibold">Add {kind === 'Learners' ? 'learner' : 'faculty member'}</div><p className="mt-1 text-sm text-ink-soft">Create a record for this institution.</p></div><button type="button" onClick={resetForm} aria-label="Close form" className="rounded-md p-1.5 text-ink-soft hover:bg-paper"><X size={18} /></button></div>
          <form onSubmit={addRecord} className="space-y-4">
            <label className="block text-sm font-semibold text-ink">Full name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" placeholder="Enter full name" /></label>
            <label className="block text-sm font-semibold text-ink">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" placeholder="name@example.com" /></label>
            <label className="block text-sm font-semibold text-ink">{detailLabel}<input value={detail} onChange={(event) => setDetail(event.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" placeholder={detailPlaceholder} /></label>
            <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={resetForm} className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper">Cancel</button><button type="submit" className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep">Create record</button></div>
          </form>
        </div>
      </div>}
    </div>
  );
}
