'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link2, Plus, Search, Unlink, UserRound, X } from 'lucide-react';
import { apiFetch, ApiClientError } from '@/lib/api-client';

type ApiParent = { id: string; name: string; email: string; phone: string | null; isActive: boolean };
type ApiStudent = { id: string; name: string; batchId: string | null };
type ApiBatch = { id: string; name: string };
type ApiLink = { id: string; parent: { id: string; name: string; email: string }; student: { id: string; name: string; batchId: string | null } };

// Admin-only page: create parent logins, and link them to the student(s)
// they should be able to see. Two independent sections on one page since
// they're two distinct actions with the same audience, mirroring how
// DirectoryPage handles Teachers/Students but with an added linking step —
// parents have no batch/subject/qualification fields of their own, so a
// generic DirectoryPage kind wouldn't fit cleanly.
export default function ParentsPage() {
  const [parents, setParents] = useState<ApiParent[]>([]);
  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [links, setLinks] = useState<ApiLink[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // Create-parent form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Link form
  const [linkParentId, setLinkParentId] = useState('');
  const [linkStudentId, setLinkStudentId] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const batchNameById = useMemo(() => new Map(batches.map((b) => [b.id, b.name])), [batches]);

  async function loadAll() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [parentList, studentList, batchList, linkList] = await Promise.all([
        apiFetch<ApiParent[]>('/api/parents?includeInactive=true'),
        apiFetch<ApiStudent[]>('/api/students'),
        apiFetch<ApiBatch[]>('/api/batches'),
        apiFetch<ApiLink[]>('/api/parent-links'),
      ]);
      setParents(parentList);
      setStudents(studentList);
      setBatches(batchList);
      setLinks(linkList);
      if (parentList.length) setLinkParentId((current) => current || parentList[0].id);
      if (studentList.length) setLinkStudentId((current) => current || studentList[0].id);
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Failed to load records.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredParents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
  }, [query, parents]);

  function closeForm() {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setFormError(null);
    setShowForm(false);
  }

  async function submitParent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiFetch('/api/parents', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, password }),
      });
      closeForm();
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Failed to create parent account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLinkError(null);
    setIsLinking(true);
    try {
      await apiFetch('/api/parent-links', {
        method: 'POST',
        body: JSON.stringify({ parentId: linkParentId, studentId: linkStudentId }),
      });
      await loadAll();
    } catch (err) {
      setLinkError(err instanceof ApiClientError ? err.message : 'Failed to create link.');
    } finally {
      setIsLinking(false);
    }
  }

  async function unlink(id: string) {
    try {
      await apiFetch(`/api/parent-links/${id}`, { method: 'DELETE' });
      setLinks((current) => current.filter((l) => l.id !== id));
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Failed to remove link.');
    }
  }

  return (
      <div className="max-w-[1040px]">
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Institution directory</div>
            <h1 className="font-display font-semibold text-[32px] tracking-tight">Parents</h1>
            <p className="text-ink-soft mt-2 max-w-[620px]">Create parent logins and link each one to their child so they can see attendance, homework, and marks.</p>
          </div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep whitespace-nowrap">
            <Plus size={17} />
            Add parent
          </button>
        </div>

        {loadError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{loadError}</div>}

        {/* Parent accounts table */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div className="text-sm text-ink-soft"><span className="font-semibold text-ink">{parents.length}</span> parent accounts</div>
          <label className="flex items-center gap-2 w-full sm:w-[280px] rounded-md border border-line bg-white px-3 py-2.5 text-sm">
            <Search size={16} className="text-ink-soft" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search parents..." className="w-full bg-transparent outline-none placeholder:text-ink-soft" />
          </label>
        </div>

        <div className="mb-8 overflow-hidden rounded-xl border border-line bg-white">
          <div className="grid grid-cols-[minmax(160px,1.2fr)_minmax(160px,1fr)_120px_100px] gap-4 border-b border-line bg-paper px-6 py-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-soft">
            <span>Name</span><span>Email</span><span>Phone</span><span>Status</span>
          </div>
          {isLoading ? (
              <div className="px-6 py-12 text-center text-sm text-ink-soft">Loading…</div>
          ) : filteredParents.length ? filteredParents.map((p) => (
              <div key={p.id} className="grid grid-cols-[minmax(160px,1.2fr)_minmax(160px,1fr)_120px_100px] gap-4 items-center border-b border-line px-6 py-4 last:border-b-0 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine/10 text-pine"><UserRound size={17} /></div>
                  <span className="truncate font-semibold text-ink">{p.name}</span>
                </div>
                <span className="truncate text-ink-soft">{p.email}</span>
                <span className="truncate text-ink-soft">{p.phone || '—'}</span>
                <span className={p.isActive ? 'text-pine font-semibold' : 'text-saffron-deep font-semibold'}>{p.isActive ? 'Active' : 'Inactive'}</span>
              </div>
          )) : <div className="px-6 py-12 text-center text-sm text-ink-soft">No parent accounts yet.</div>}
        </div>

        {/* Link parent to student */}
        <div className="mb-4">
          <h2 className="font-display font-semibold text-xl mb-1">Link a parent to a student</h2>
          <p className="text-sm text-ink-soft">The parent will be able to see this student&apos;s attendance, homework, and marks.</p>
        </div>

        <form onSubmit={submitLink} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4">
          <label className="block text-sm font-semibold text-ink">
            Parent
            <select required value={linkParentId} onChange={(e) => setLinkParentId(e.target.value)} className="mt-1.5 min-w-[220px] rounded-md border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-pine">
              {!parents.length && <option>No parent accounts yet</option>}
              {parents.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.email}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-ink">
            Student
            <select required value={linkStudentId} onChange={(e) => setLinkStudentId(e.target.value)} className="mt-1.5 min-w-[220px] rounded-md border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-pine">
              {!students.length && <option>No students yet</option>}
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.batchId ? ` · ${batchNameById.get(s.batchId) ?? ''}` : ''}</option>)}
            </select>
          </label>
          <button disabled={isLinking || !parents.length || !students.length} className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-50">
            <Link2 size={16} />
            {isLinking ? 'Linking…' : 'Link'}
          </button>
        </form>

        {linkError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{linkError}</div>}

        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="grid grid-cols-[1.2fr_1.2fr_80px] gap-4 border-b border-line bg-paper px-6 py-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-soft">
            <span>Parent</span><span>Student</span><span></span>
          </div>
          {links.length ? links.map((l) => (
              <div key={l.id} className="grid grid-cols-[1.2fr_1.2fr_80px] gap-4 items-center border-b border-line px-6 py-4 last:border-b-0 text-sm">
                <span className="truncate font-semibold text-ink">{l.parent.name} <span className="font-normal text-ink-soft">· {l.parent.email}</span></span>
                <span className="truncate text-ink-soft">{l.student.name}</span>
                <button onClick={() => unlink(l.id)} aria-label="Unlink" className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline">
                  <Unlink size={13} />
                  Unlink
                </button>
              </div>
          )) : <div className="px-6 py-12 text-center text-sm text-ink-soft">No parent-student links yet.</div>}
        </div>

        {showForm && (
            <div className="fixed inset-0 z-20 flex items-center justify-center bg-pine-deep/35 px-4">
              <div className="w-full max-w-[500px] rounded-xl border border-line bg-white p-7 shadow-xl">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="font-display text-[22px] font-semibold">Add parent</div>
                    <p className="mt-1 text-sm text-ink-soft">Create a login account for this institution.</p>
                  </div>
                  <button onClick={closeForm} aria-label="Close form" className="rounded-md p-1.5 text-ink-soft hover:bg-paper"><X size={18} /></button>
                </div>
                <form onSubmit={submitParent} className="space-y-4">
                  <label className="block text-sm font-semibold text-ink">
                    Full name
                    <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" placeholder="Enter full name" />
                  </label>
                  <label className="block text-sm font-semibold text-ink">
                    Email address
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" placeholder="name@example.com" />
                  </label>
                  <label className="block text-sm font-semibold text-ink">
                    Phone <span className="font-normal text-ink-soft">(optional)</span>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" placeholder="+91..." />
                  </label>
                  <label className="block text-sm font-semibold text-ink">
                    Password
                    <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" placeholder="At least 8 characters" />
                  </label>
                  {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={closeForm} className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper">Cancel</button>
                    <button disabled={isSubmitting} className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-50">{isSubmitting ? 'Creating…' : 'Create account'}</button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  );
}
