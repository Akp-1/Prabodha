'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Link2, Plus, Search, Unlink, UserRound, X } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

/* ---------- Types ---------- */

type LinkedStudent = { id: string; name: string; email: string; batchId?: string | null };
type LinkRecord = { id: string; student: LinkedStudent };

type ApiParent = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  parentLinksAsParent: LinkRecord[];
};

type ApiStudent = { id: string; name: string; email: string; batchId?: string | null; isActive: boolean };

/* ---------- Component ---------- */

export function ParentsPage() {
  /* ---- State ---- */
  const [parents, setParents] = useState<ApiParent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  // Enroll modal
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrollName, setEnrollName] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollPhone, setEnrollPhone] = useState('');
  const [enrollPassword, setEnrollPassword] = useState('Welcome@123');
  const [showPassword, setShowPassword] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  // Link modal
  const [linkParent, setLinkParent] = useState<ApiParent | null>(null);
  const [allStudents, setAllStudents] = useState<ApiStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [linkBusy, setLinkBusy] = useState<string | null>(null); // studentId being toggled

  /* ---- Fetch parents ---- */
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<ApiParent[]>('/api/parents');
        setParents(data);
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---- Filtered list ---- */
  const filteredParents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) =>
      [p.name, p.email, p.phone || ''].some((v) => v.toLowerCase().includes(q))
    );
  }, [query, parents]);

  /* ---- Enroll form ---- */
  const resetEnroll = () => {
    setEnrollName('');
    setEnrollEmail('');
    setEnrollPhone('');
    setEnrollPassword('Welcome@123');
    setShowPassword(false);
    setShowEnroll(false);
  };

  const handleEnroll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedPw = enrollPassword.trim();
    if (trimmedPw.length < 8) {
      alert('Password must be at least 8 characters.');
      return;
    }
    setEnrolling(true);
    try {
      const created = await apiFetch<ApiParent>('/api/parents', {
        method: 'POST',
        body: JSON.stringify({
          name: enrollName.trim(),
          email: enrollEmail.trim(),
          phone: enrollPhone.trim() || undefined,
          password: trimmedPw,
        }),
      });
      setParents((prev) => [created, ...prev]);
      resetEnroll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to enroll parent');
    } finally {
      setEnrolling(false);
    }
  };

  /* ---- Link modal helpers ---- */
  const openLinkModal = async (parent: ApiParent) => {
    setLinkParent(parent);
    setStudentsLoading(true);
    try {
      const students = await apiFetch<ApiStudent[]>('/api/students');
      setAllStudents(students);
    } catch {
      setAllStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const closeLinkModal = () => {
    setLinkParent(null);
    setAllStudents([]);
  };

  const isStudentLinked = (studentId: string): LinkRecord | undefined => {
    return linkParent?.parentLinksAsParent.find((l) => l.student.id === studentId);
  };

  const toggleLink = async (studentId: string) => {
    if (!linkParent || linkBusy) return;
    setLinkBusy(studentId);
    const existingLink = isStudentLinked(studentId);

    try {
      if (existingLink) {
        // Unlink
        await apiFetch(`/api/parent-student-links/${existingLink.id}`, { method: 'DELETE' });
        const updatedLinks = linkParent.parentLinksAsParent.filter((l) => l.id !== existingLink.id);
        const updatedParent = { ...linkParent, parentLinksAsParent: updatedLinks };
        setLinkParent(updatedParent);
        setParents((prev) => prev.map((p) => (p.id === linkParent.id ? updatedParent : p)));
      } else {
        // Link
        const link = await apiFetch<{ id: string; student: LinkedStudent }>('/api/parent-student-links', {
          method: 'POST',
          body: JSON.stringify({ parentId: linkParent.id, studentId }),
        });
        const updatedLinks = [...linkParent.parentLinksAsParent, link];
        const updatedParent = { ...linkParent, parentLinksAsParent: updatedLinks };
        setLinkParent(updatedParent);
        setParents((prev) => prev.map((p) => (p.id === linkParent.id ? updatedParent : p)));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update link');
    } finally {
      setLinkBusy(null);
    }
  };

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="max-w-[1040px]">
        <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Institution directory</div>
        <h1 className="font-display font-semibold text-[32px] tracking-tight mb-6">Parents</h1>
        <div className="text-sm text-ink-soft">Loading…</div>
      </div>
    );
  }

  /* ---- Render ---- */
  return (
    <div className="max-w-[1040px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Institution directory</div>
          <h1 className="font-display font-semibold text-[32px] tracking-tight">Parents</h1>
          <p className="text-ink-soft mt-2 max-w-[620px]">Manage parent accounts and link them to learners so they can view attendance, homework status, and academic reports.</p>
        </div>
        <button type="button" onClick={() => setShowEnroll(true)} className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep transition-colors whitespace-nowrap">
          <Plus size={17} />
          Enroll parent
        </button>
      </div>

      {/* Search + count */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="text-sm text-ink-soft"><span className="font-semibold text-ink">{parents.length}</span> total records</div>
        <label className="flex items-center gap-2 w-full sm:w-[280px] rounded-md border border-line bg-white px-3 py-2.5 text-sm">
          <Search size={16} className="text-ink-soft" />
          <span className="sr-only">Search parents</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search parents..." className="w-full bg-transparent outline-none placeholder:text-ink-soft" />
        </label>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="grid grid-cols-[minmax(160px,1.2fr)_minmax(160px,1fr)_minmax(100px,0.7fr)_minmax(140px,1fr)_90px] gap-4 border-b border-line bg-paper px-6 py-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-soft">
          <span>Name</span><span>Email</span><span>Phone</span><span>Linked learners</span><span>Actions</span>
        </div>
        {filteredParents.length > 0 ? filteredParents.map((parent) => (
          <div key={parent.id} className="grid grid-cols-[minmax(160px,1.2fr)_minmax(160px,1fr)_minmax(100px,0.7fr)_minmax(140px,1fr)_90px] gap-4 items-center border-b border-line px-6 py-4 last:border-b-0 text-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine/10 text-pine"><UserRound size={17} /></div>
              <span className="truncate font-semibold text-ink">{parent.name}</span>
            </div>
            <span className="truncate text-ink-soft">{parent.email}</span>
            <span className="truncate text-ink-soft">{parent.phone || '—'}</span>
            <div className="flex flex-wrap gap-1.5 min-w-0">
              {parent.parentLinksAsParent.length > 0
                ? parent.parentLinksAsParent.map((link) => (
                    <span key={link.id} className="inline-flex items-center rounded-full bg-pine/10 px-2.5 py-0.5 text-xs font-medium text-pine truncate max-w-[130px]">{link.student.name}</span>
                  ))
                : <span className="text-xs text-ink-soft">No linked learners</span>}
            </div>
            <button type="button" onClick={() => openLinkModal(parent)} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper transition-colors whitespace-nowrap">
              <Link2 size={13} />
              Links
            </button>
          </div>
        )) : (
          <div className="px-6 py-12 text-center text-sm text-ink-soft">No matching records found.</div>
        )}
      </div>

      {/* ---- Enroll Modal ---- */}
      {showEnroll && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-pine-deep/35 px-4">
          <div className="w-full max-w-[500px] rounded-xl border border-line bg-white p-7 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="font-display text-[22px] font-semibold">Enroll parent</div>
                <p className="mt-1 text-sm text-ink-soft">Create a parent account for this institution.</p>
              </div>
              <button type="button" onClick={resetEnroll} aria-label="Close form" className="rounded-md p-1.5 text-ink-soft hover:bg-paper"><X size={18} /></button>
            </div>
            <form onSubmit={handleEnroll} className="space-y-4">
              <label className="block text-sm font-semibold text-ink">Full name<input required value={enrollName} onChange={(e) => setEnrollName(e.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" placeholder="Enter full name" /></label>
              <label className="block text-sm font-semibold text-ink">Email address<input required type="email" value={enrollEmail} onChange={(e) => setEnrollEmail(e.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" placeholder="name@example.com" /></label>
              <label className="block text-sm font-semibold text-ink">Phone number<input value={enrollPhone} onChange={(e) => setEnrollPhone(e.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" placeholder="Optional" /></label>
              <label className="block text-sm font-semibold text-ink">Initial password
                <span className="relative block">
                  <input required minLength={8} type={showPassword ? 'text' : 'password'} value={enrollPassword} onChange={(e) => setEnrollPassword(e.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 pr-10 font-normal outline-none focus:border-pine" placeholder="Min. 8 characters" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetEnroll} className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper">Cancel</button>
                <button type="submit" disabled={enrolling} className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-60">{enrolling ? 'Creating…' : 'Create record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Link Management Modal ---- */}
      {linkParent && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-pine-deep/35 px-4">
          <div className="w-full max-w-[540px] rounded-xl border border-line bg-white p-7 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="font-display text-[22px] font-semibold">Manage learner links</div>
                <p className="mt-1 text-sm text-ink-soft">Link or unlink learners for <span className="font-semibold text-ink">{linkParent.name}</span></p>
              </div>
              <button type="button" onClick={closeLinkModal} aria-label="Close" className="rounded-md p-1.5 text-ink-soft hover:bg-paper"><X size={18} /></button>
            </div>

            {studentsLoading ? (
              <div className="py-8 text-center text-sm text-ink-soft">Loading learners…</div>
            ) : allStudents.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-soft">No learners enrolled in this institute yet.</div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto -mx-1 px-1">
                {allStudents.map((student) => {
                  const existingLink = isStudentLinked(student.id);
                  const isBusy = linkBusy === student.id;
                  return (
                    <div key={student.id} className="flex items-center justify-between gap-4 py-3 border-b border-line last:border-b-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pine/10 text-pine"><UserRound size={15} /></div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ink truncate">{student.name}</div>
                          <div className="text-xs text-ink-soft truncate">{student.email}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => toggleLink(student.id)}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 ${
                          existingLink
                            ? 'border border-red-200 text-red-600 hover:bg-red-50'
                            : 'border border-pine/30 text-pine hover:bg-pine/5'
                        }`}
                      >
                        {isBusy ? '…' : existingLink ? <><Unlink size={12} /> Unlink</> : <><Link2 size={12} /> Link</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-4 mt-2 border-t border-line">
              <button type="button" onClick={closeLinkModal} className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
