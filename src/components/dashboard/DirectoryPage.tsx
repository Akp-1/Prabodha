'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Plus, Search, UserRound, X } from 'lucide-react';
import { apiFetch, ApiClientError } from '@/lib/api-client';

export type DirectoryRecord = {
  id: string;
  name: string;
  email: string;
  detail: string;
  status: 'Active' | 'Inactive';
};

type ApiTeacher = {
  id: string;
  name: string;
  email: string;
  qualification: string | null;
  isActive: boolean;
};

type ApiStudent = {
  id: string;
  name: string;
  email: string;
  batchId: string | null;
  isActive: boolean;
};

type ApiBatch = { id: string; name: string };

type DirectoryPageProps = {
  kind: 'Learners' | 'Faculty';
  description: string;
  addLabel: string;
  detailLabel: string;
  detailPlaceholder: string;
};

/**
 * Wired to the real Teachers/Students APIs (previously read/wrote
 * InstitutionStore's localStorage mock — see LOG.md Session 11). Faculty ->
 * /api/teachers, Learners -> /api/students, matching the ROADMAP's Dashboard
 * Wiring (Admin) item.
 */
export function DirectoryPage({ kind, description, addLabel, detailLabel, detailPlaceholder }: DirectoryPageProps) {
  const [records, setRecords] = useState<DirectoryRecord[]>([]);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Welcome@123');
  const [showPassword, setShowPassword] = useState(false);
  const [detail, setDetail] = useState(''); // qualification (Faculty) or batchId (Learners)
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadRecords() {
    setIsLoading(true);
    setLoadError(null);
    try {
      if (kind === 'Faculty') {
        const teachers = await apiFetch<ApiTeacher[]>('/api/teachers?includeInactive=true');
        setRecords(
            teachers.map((t) => ({
              id: t.id,
              name: t.name,
              email: t.email,
              detail: t.qualification || '—',
              status: t.isActive ? 'Active' : 'Inactive',
            }))
        );
      } else {
        const [students, batchList] = await Promise.all([
          apiFetch<ApiStudent[]>('/api/students?includeInactive=true'),
          apiFetch<ApiBatch[]>('/api/batches'),
        ]);
        setBatches(batchList);
        const nameById = new Map(batchList.map((b) => [b.id, b.name]));
        setRecords(
            students.map((s) => ({
              id: s.id,
              name: s.name,
              email: s.email,
              detail: (s.batchId && nameById.get(s.batchId)) || 'Unassigned',
              status: s.isActive ? 'Active' : 'Inactive',
            }))
        );
      }
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Failed to load records.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return records;
    return records.filter((record) => [record.name, record.email, record.detail].some((value) => value.toLowerCase().includes(normalizedQuery)));
  }, [query, records]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('Welcome@123');
    setShowPassword(false);
    setDetail('');
    setFormError(null);
    setShowForm(false);
  };

  const addRecord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedPassword = password.trim();
    if (trimmedPassword.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (kind === 'Faculty') {
        await apiFetch('/api/teachers', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password: trimmedPassword, qualification: detail.trim() || undefined }),
        });
      } else {
        await apiFetch('/api/students', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password: trimmedPassword, batchId: detail || undefined }),
        });
      }
      resetForm();
      await loadRecords();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Failed to create record.');
    } finally {
      setIsSubmitting(false);
    }
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

        {loadError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{loadError}</div>
        )}

        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="grid grid-cols-[minmax(180px,1.4fr)_minmax(180px,1fr)_minmax(140px,0.8fr)_100px] gap-4 border-b border-line bg-paper px-6 py-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-soft">
            <span>Name</span><span>Email</span><span>{detailLabel}</span><span>Status</span>
          </div>
          {isLoading ? (
              <div className="px-6 py-12 text-center text-sm text-ink-soft">Loading…</div>
          ) : filteredRecords.length > 0 ? filteredRecords.map((record) => (
              <div key={record.id} className="grid grid-cols-[minmax(180px,1.4fr)_minmax(180px,1fr)_minmax(140px,0.8fr)_100px] gap-4 items-center border-b border-line px-6 py-4 last:border-b-0 text-sm">
                <div className="flex items-center gap-3 min-w-0"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine/10 text-pine"><UserRound size={17} /></div><span className="truncate font-semibold text-ink">{record.name}</span></div>
                <span className="truncate text-ink-soft">{record.email}</span><span className="truncate text-ink-soft">{record.detail}</span>
                <span className={record.status === 'Active' ? 'text-pine font-semibold' : 'text-saffron-deep font-semibold'}>{record.status}</span>
              </div>
          )) : <div className="px-6 py-12 text-center text-sm text-ink-soft">No matching records found.</div>}
        </div>

        {showForm && <div className="fixed inset-0 z-20 flex items-center justify-center bg-pine-deep/35 px-4">
          <div className="w-full max-w-[500px] rounded-xl border border-line bg-white p-7 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-6"><div><div className="font-display text-[22px] font-semibold">Add {kind === 'Learners' ? 'learner' : 'faculty member'}</div><p className="mt-1 text-sm text-ink-soft">Create a login account for this institution.</p></div><button type="button" onClick={resetForm} aria-label="Close form" className="rounded-md p-1.5 text-ink-soft hover:bg-paper"><X size={18} /></button></div>
            <form onSubmit={addRecord} className="space-y-4">
              <label className="block text-sm font-semibold text-ink">Full name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" placeholder="Enter full name" /></label>
              <label className="block text-sm font-semibold text-ink">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" placeholder="name@example.com" /></label>
              <label className="block text-sm font-semibold text-ink">Initial password
                <span className="relative block">
                  <input required minLength={8} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 pr-10 font-normal outline-none focus:border-pine" placeholder="Min. 8 characters" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </span>
              </label>
              {kind === 'Learners' ? (
                  <label className="block text-sm font-semibold text-ink">{detailLabel}
                    <select value={detail} onChange={(event) => setDetail(event.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine bg-white">
                      <option value="">Unassigned</option>
                      {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </label>
              ) : (
                  <label className="block text-sm font-semibold text-ink">{detailLabel}<input value={detail} onChange={(event) => setDetail(event.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" placeholder={detailPlaceholder} /></label>
              )}
              {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={resetForm} className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper">Cancel</button><button type="submit" disabled={isSubmitting} className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-50">{isSubmitting ? 'Creating…' : 'Create record'}</button></div>
            </form>
          </div>
        </div>}
      </div>
  );
}