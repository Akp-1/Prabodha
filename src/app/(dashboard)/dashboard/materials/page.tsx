'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, FileImage, Link2, StickyNote, Plus, Search, X, ExternalLink, Trash2 } from 'lucide-react';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/components/auth/AuthProvider';

type MaterialType = 'note' | 'pdf' | 'image' | 'link';

type Material = {
  id: string;
  title: string;
  description: string | null;
  materialType: MaterialType;
  fileUrl: string | null;
  filePath: string | null;
  externalLink: string | null;
  batch: { id: string; name: string } | null;
  subject: { id: string; name: string } | null;
  uploader: { id: string; name: string } | null;
  createdAt: string;
};

type Batch = { id: string; name: string };
type Subject = { id: string; name: string };
type Assignment = { id: string; batch: { id: string; name: string }; subject: { id: string; name: string } };
type ParentLink = { student: { id: string; name: string; batchId: string | null } };

const TYPE_ICON: Record<MaterialType, typeof FileText> = {
  note: StickyNote,
  pdf: FileText,
  image: FileImage,
  link: Link2,
};

export default function MaterialsPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'teacher';
  const isTeacher = user?.role === 'teacher';
  const isParent = user?.role === 'parent';

  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchOptions, setBatchOptions] = useState<Batch[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<Subject[]>([]);
  const [assignmentOptions, setAssignmentOptions] = useState<Assignment[]>([]);

  const [title, setTitle] = useState('');
  const [batchId, setBatchId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [materialType, setMaterialType] = useState<MaterialType>('note');
  const [link, setLink] = useState('');

  const [parentLinks, setParentLinks] = useState<ParentLink[]>([]);

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<Material[]>('/api/materials');
      setMaterials(data);
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Failed to load study materials.');
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
        if (isTeacher) {
          // Scoped to only what this teacher is currently assigned to teach —
          // matches the pattern used in Attendance/Homework's teacher forms,
          // instead of letting them pick any batch/subject and finding out
          // they're not assigned only at submit time.
          const assignments = await apiFetch<Assignment[]>('/api/assignments');
          setAssignmentOptions(assignments);
          if (assignments.length) setAssignmentId(assignments[0].id);
        } else {
          const [batches, subjects] = await Promise.all([
            apiFetch<Batch[]>('/api/batches'),
            apiFetch<Subject[]>('/api/subjects'),
          ]);
          setBatchOptions(batches);
          setSubjectOptions(subjects);
        }
      } catch {
        // Non-fatal — pickers just render empty.
      }
    })();
  }, [canManage, isTeacher]);

  useEffect(() => {
    if (!isParent) return;
    (async () => {
      try {
        const links = await apiFetch<ParentLink[]>('/api/parent-links');
        setParentLinks(links);
      } catch {
        // Non-fatal — the list will just show batch/subject without a "for <child>" label.
      }
    })();
  }, [isParent]);

  const filtered = materials.filter((m) => !query || m.title.toLowerCase().includes(query.toLowerCase()));

  // Drive-like grouping: one folder-ish section per subject.
  const grouped = useMemo(() => {
    const bySubject = new Map<string, Material[]>();
    for (const m of filtered) {
      const key = m.subject?.name ?? 'Unassigned';
      if (!bySubject.has(key)) bySubject.set(key, []);
      bySubject.get(key)!.push(m);
    }
    return [...bySubject.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  function close() {
    setTitle('');
    setBatchId('');
    setSubjectId('');
    setAssignmentId(assignmentOptions[0]?.id ?? '');
    setMaterialType('note');
    setLink('');
    setFormError(null);
    setShowForm(false);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      let resolvedBatchId = batchId;
      let resolvedSubjectId = subjectId;
      if (isTeacher) {
        const assignment = assignmentOptions.find((a) => a.id === assignmentId);
        if (!assignment) {
          setFormError('Select a class first.');
          setIsSubmitting(false);
          return;
        }
        resolvedBatchId = assignment.batch.id;
        resolvedSubjectId = assignment.subject.id;
      }
      const body: Record<string, unknown> = { batchId: resolvedBatchId, subjectId: resolvedSubjectId, title: title.trim(), materialType };
      if (materialType === 'link') body.externalLink = link.trim();
      else body.fileUrl = link.trim();
      await apiFetch('/api/materials', { method: 'POST', body: JSON.stringify(body) });
      close();
      await load();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Failed to publish material.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function remove(id: string) {
    try {
      await apiFetch(`/api/materials/${id}`, { method: 'DELETE' });
      setMaterials((current) => current.filter((m) => m.id !== id));
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Failed to delete this material.');
    }
  }

  function openLink(m: Material) {
    const url = m.materialType === 'link' ? m.externalLink : m.fileUrl;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
      <div className="max-w-[1040px]">
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Learning workspace</div>
            <h1 className="font-display font-semibold text-[32px] tracking-tight">Study materials</h1>
            <p className="text-ink-soft mt-2 max-w-[640px]">
              {canManage
                  ? 'Publish notes, documents, and links organized by subject.'
                  : isParent
                      ? "Notes, documents, and links your child's teachers have shared."
                      : 'Notes, documents, and links your teachers have shared for your batch.'}
            </p>
          </div>
          {canManage && (
              <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep whitespace-nowrap">
                <Plus size={17} />
                Publish material
              </button>
          )}
        </div>

        <label className="mb-5 flex items-center gap-2 w-full sm:w-[280px] rounded-md border border-line bg-white px-3 py-2.5 text-sm">
          <Search size={16} className="text-ink-soft" />
          <span className="sr-only">Search materials</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search materials..." className="w-full bg-transparent outline-none placeholder:text-ink-soft" />
        </label>

        {loadError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{loadError}</div>}

        {isLoading ? (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">Loading materials…</div>
        ) : grouped.length ? (
            <div className="space-y-6">
              {grouped.map(([subjectName, items]) => (
                  <section key={subjectName} className="overflow-hidden rounded-xl border border-line bg-white">
                    <div className="border-b border-line bg-paper px-5 py-3 font-display font-semibold">{subjectName}</div>
                    <div className="divide-y divide-line">
                      {items.map((m) => {
                        const Icon = TYPE_ICON[m.materialType];
                        const canDelete = user?.role === 'admin' || m.uploader?.id === user?.id;
                        const myChild = isParent ? parentLinks.find((l) => l.student.batchId === m.batch?.id)?.student : undefined;
                        return (
                            <div key={m.id} className="flex items-center justify-between gap-4 px-5 py-4">
                              <button onClick={() => openLink(m)} className="flex items-center gap-3 text-left min-w-0 flex-1 group">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-pine/10 text-pine">
                                  <Icon size={17} />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-sm text-ink truncate group-hover:underline">{m.title}</div>
                                  <div className="text-xs text-ink-soft">
                                    {m.batch?.name ?? '—'} · {m.uploader?.name ?? 'Unknown'} · {m.materialType}
                                    {isParent && myChild && <> · for {myChild.name}</>}
                                  </div>
                                </div>
                              </button>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => openLink(m)} aria-label="Open material" className="p-2 text-ink-soft hover:bg-paper rounded-md">
                                  <ExternalLink size={16} />
                                </button>
                                {canDelete && (
                                    <button onClick={() => remove(m.id)} aria-label="Delete material" className="p-2 text-red-600 hover:bg-red-50 rounded-md">
                                      <Trash2 size={16} />
                                    </button>
                                )}
                              </div>
                            </div>
                        );
                      })}
                    </div>
                  </section>
              ))}
            </div>
        ) : (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">
              {canManage ? 'No materials published yet.' : isParent ? "No study materials have been shared for your child's batch yet." : 'No study materials have been shared for your batch yet.'}
            </div>
        )}

        {showForm && (
            <div className="fixed inset-0 z-20 flex items-center justify-center bg-pine-deep/35 px-4">
              <div className="w-full max-w-[500px] rounded-xl border border-line bg-white p-7 shadow-xl">
                <div className="flex justify-between gap-4 mb-6">
                  <div>
                    <div className="font-display text-[22px] font-semibold">Publish material</div>
                    <p className="mt-1 text-sm text-ink-soft">Add this resource to the learning workspace.</p>
                  </div>
                  <button onClick={close} aria-label="Close form" className="p-1.5 text-ink-soft hover:bg-paper rounded-md"><X size={18} /></button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                  <label className="block text-sm font-semibold text-ink">
                    Title
                    <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Thermodynamics notes" className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" />
                  </label>
                  {isTeacher ? (
                      <label className="block text-sm font-semibold text-ink">
                        Class
                        <select
                            required
                            value={assignmentId}
                            onChange={(e) => setAssignmentId(e.target.value)}
                            disabled={!assignmentOptions.length}
                            className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-pine"
                        >
                          {!assignmentOptions.length && <option>No assigned classes</option>}
                          {assignmentOptions.map((a) => (
                              <option key={a.id} value={a.id}>{a.batch.name} · {a.subject.name}</option>
                          ))}
                        </select>
                      </label>
                  ) : (
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
                  )}
                  <label className="block text-sm font-semibold text-ink">
                    Type
                    <select value={materialType} onChange={(e) => setMaterialType(e.target.value as MaterialType)} className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-pine">
                      <option value="note">Note</option>
                      <option value="pdf">PDF</option>
                      <option value="image">Image</option>
                      <option value="link">Link</option>
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-ink">
                    {materialType === 'link' ? 'External link' : 'File URL'}
                    <input required type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" />
                  </label>

                  {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={close} className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper">Cancel</button>
                    <button disabled={isSubmitting} className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-50">{isSubmitting ? 'Saving…' : 'Publish'}</button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  );
}