'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { apiFetch, ApiClientError } from '@/lib/api-client';

export type ResourceKind = 'batches' | 'subjects' | 'materials' | 'homework' | 'assessments';

// All five resource kinds are now wired to real APIs — batches/subjects since
// Session 11, materials/homework/assessments added this session (see LOG.md).
// InstitutionStore's mock data is no longer used anywhere in this component.
const RESOURCE_TO_ENDPOINT: Record<ResourceKind, string> = {
  batches: '/api/batches',
  subjects: '/api/subjects',
  materials: '/api/materials',
  homework: '/api/homework',
  assessments: '/api/exams',
};

// Only these need a batch+subject picker in their create form.
const NEEDS_BATCH_SUBJECT: ResourceKind[] = ['materials', 'homework', 'assessments'];

const CONFIG: Record<ResourceKind, { title: string; eyebrow: string; description: string; addLabel: string; columns: [string, string, string] }> = {
  batches: { title: 'Batches and sections', eyebrow: 'Academic structure', description: 'Group learners into batches or sections before planning their academic schedule.', addLabel: 'Create batch', columns: ['Batch / section', 'Students', ''] },
  subjects: { title: 'Subjects', eyebrow: 'Academic structure', description: 'Create the subjects that faculty can teach and that learners will see in their academic workspace.', addLabel: 'Create subject', columns: ['Subject', '', ''] },
  materials: { title: 'Study materials', eyebrow: 'Learning workspace', description: 'Keep notes, documents, and useful links organized by the batch and subject they support.', addLabel: 'Publish material', columns: ['Material', 'Subject', 'Batch'] },
  homework: { title: 'Homework', eyebrow: 'Learning workspace', description: 'Assign work with a clear due date so learners and parents always know what is pending.', addLabel: 'Assign homework', columns: ['Homework', 'Subject', 'Due date'] },
  assessments: { title: 'Marks and assessments', eyebrow: 'Academic performance', description: 'Capture assessments and give management a simple, visible view of learner performance.', addLabel: 'Create assessment', columns: ['Assessment', 'Subject', 'Average / maximum'] },
};

type Row = { id: string; values: [string, string, string]; status?: string };
type ApiBatch = { id: string; name: string };
type ApiSubject = { id: string; name: string };
type ApiStudent = { id: string; batchId: string | null };

type ApiMaterial = { id: string; title: string; materialType: string; batch: { name: string } | null; subject: { name: string } | null };
type ApiHomework = { id: string; title: string; dueDate: string; batch: { name: string } | null; subject: { name: string } | null };
type ApiExam = { id: string; name: string; maxMarks: number; batch: { name: string } | null; subject: { name: string } | null; summary: { average: number | null } };

export function AdminResourcePage({ resource }: { resource: ResourceKind }) {
  const config = CONFIG[resource];
  const needsBatchSubject = NEEDS_BATCH_SUBJECT.includes(resource);

  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Options for the batch/subject <select> pickers — only fetched for the
  // three resource kinds that need them.
  const [batchOptions, setBatchOptions] = useState<ApiBatch[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<ApiSubject[]>([]);

  // Form fields. Not every resource uses every field; see the per-resource
  // form below.
  const [name, setName] = useState(''); // title / batch name / subject name
  const [batchId, setBatchId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [materialType, setMaterialType] = useState<'note' | 'pdf' | 'image' | 'link'>('note');
  const [link, setLink] = useState(''); // fileUrl (note/pdf/image) or externalLink (link)
  const [dueDate, setDueDate] = useState('');
  const [examDate, setExamDate] = useState('');
  const [maxMarks, setMaxMarks] = useState('');

  async function loadRows() {
    setIsLoading(true);
    setLoadError(null);
    try {
      if (resource === 'batches') {
        const [batches, students] = await Promise.all([
          apiFetch<ApiBatch[]>('/api/batches'),
          apiFetch<ApiStudent[]>('/api/students?includeInactive=true'),
        ]);
        const countByBatch = new Map<string, number>();
        for (const s of students) {
          if (!s.batchId) continue;
          countByBatch.set(s.batchId, (countByBatch.get(s.batchId) ?? 0) + 1);
        }
        setRows(batches.map((b) => ({ id: b.id, values: [b.name, `${countByBatch.get(b.id) ?? 0} students`, ''] })));
      } else if (resource === 'subjects') {
        const subjects = await apiFetch<ApiSubject[]>('/api/subjects');
        setRows(subjects.map((s) => ({ id: s.id, values: [s.name, '', ''] })));
      } else if (resource === 'materials') {
        const materials = await apiFetch<ApiMaterial[]>('/api/materials');
        setRows(materials.map((m) => ({ id: m.id, values: [m.title, m.subject?.name ?? '—', m.batch?.name ?? '—'], status: m.materialType })));
      } else if (resource === 'homework') {
        const homework = await apiFetch<ApiHomework[]>('/api/homework');
        setRows(homework.map((h) => ({ id: h.id, values: [h.title, h.subject?.name ?? '—', h.dueDate.slice(0, 10)] })));
      } else if (resource === 'assessments') {
        const exams = await apiFetch<ApiExam[]>('/api/exams');
        setRows(exams.map((e) => ({
          id: e.id,
          values: [e.name, e.subject?.name ?? '—', `${e.summary.average !== null ? e.summary.average.toFixed(1) : '—'} / ${e.maxMarks}`],
        })));
      }
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Failed to load records.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  // Batch/subject picker options — loaded once per resource kind, only when needed.
  useEffect(() => {
    if (!needsBatchSubject) return;
    (async () => {
      try {
        const [batches, subjects] = await Promise.all([
          apiFetch<ApiBatch[]>('/api/batches'),
          apiFetch<ApiSubject[]>('/api/subjects'),
        ]);
        setBatchOptions(batches);
        setSubjectOptions(subjects);
      } catch {
        // Non-fatal — the selects just render empty; the picker's own
        // required attribute stops a broken submission.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, needsBatchSubject]);

  const filtered = rows.filter((row) => !query || row.values.some((value) => value.toLowerCase().includes(query.toLowerCase())));

  function close() {
    setName('');
    setBatchId('');
    setSubjectId('');
    setMaterialType('note');
    setLink('');
    setDueDate('');
    setExamDate('');
    setMaxMarks('');
    setFormError(null);
    setShowForm(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      if (resource === 'batches' || resource === 'subjects') {
        await apiFetch(RESOURCE_TO_ENDPOINT[resource], { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
      } else if (resource === 'materials') {
        const body: Record<string, unknown> = { batchId, subjectId, title: name.trim(), materialType };
        if (materialType === 'link') body.externalLink = link.trim();
        else body.fileUrl = link.trim();
        await apiFetch('/api/materials', { method: 'POST', body: JSON.stringify(body) });
      } else if (resource === 'homework') {
        await apiFetch('/api/homework', {
          method: 'POST',
          body: JSON.stringify({ batchId, subjectId, title: name.trim(), dueDate }),
        });
      } else if (resource === 'assessments') {
        await apiFetch('/api/exams', {
          method: 'POST',
          body: JSON.stringify({ batchId, subjectId, name: name.trim(), examDate, maxMarks: Number(maxMarks) }),
        });
      }
      close();
      await loadRows();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Failed to create record.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
      <div className="max-w-[1040px]">
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">{config.eyebrow}</div>
            <h1 className="font-display font-semibold text-[32px] tracking-tight">{config.title}</h1>
            <p className="text-ink-soft mt-2 max-w-[640px]">{config.description}</p>
          </div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep whitespace-nowrap">
            <Plus size={17} />
            {config.addLabel}
          </button>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
          <span className="text-sm text-ink-soft"><strong className="text-ink">{rows.length}</strong> records</span>
          <label className="flex items-center gap-2 w-full sm:w-[280px] rounded-md border border-line bg-white px-3 py-2.5 text-sm">
            <Search size={16} className="text-ink-soft" />
            <span className="sr-only">Search records</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records..." className="w-full bg-transparent outline-none placeholder:text-ink-soft" />
          </label>
        </div>

        {loadError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{loadError}</div>}

        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_100px] gap-4 border-b border-line bg-paper px-6 py-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-soft">
            <span>{config.columns[0]}</span><span>{config.columns[1]}</span><span>{config.columns[2]}</span><span>State</span>
          </div>
          {isLoading ? (
              <div className="px-6 py-12 text-center text-sm text-ink-soft">Loading…</div>
          ) : filtered.length ? filtered.map((row) => (
              <div key={row.id} className="grid grid-cols-[1.4fr_1fr_1fr_100px] gap-4 items-center border-b border-line px-6 py-4 last:border-b-0 text-sm">
                <span className="truncate font-semibold text-ink">{row.values[0]}</span>
                <span className="truncate text-ink-soft">{row.values[1]}</span>
                <span className="truncate text-ink-soft">{row.values[2]}</span>
                <span className="font-semibold text-pine capitalize">{row.status ?? 'Active'}</span>
              </div>
          )) : <div className="px-6 py-12 text-center text-sm text-ink-soft">No matching records found.</div>}
        </div>

        {showForm && (
            <div className="fixed inset-0 z-20 flex items-center justify-center bg-pine-deep/35 px-4">
              <div className="w-full max-w-[500px] rounded-xl border border-line bg-white p-7 shadow-xl">
                <div className="flex justify-between gap-4 mb-6">
                  <div>
                    <div className="font-display text-[22px] font-semibold">{config.addLabel}</div>
                    <p className="mt-1 text-sm text-ink-soft">Add this record to the institution workspace.</p>
                  </div>
                  <button onClick={close} aria-label="Close form" className="p-1.5 text-ink-soft hover:bg-paper rounded-md"><X size={18} /></button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  {(resource === 'batches' || resource === 'subjects') && (
                      <label className="block text-sm font-semibold text-ink">
                        {resource === 'batches' ? 'Batch or section name' : 'Subject name'}
                        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={resource === 'batches' ? 'e.g. Class 11 Science' : 'e.g. Mathematics'} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" />
                      </label>
                  )}

                  {needsBatchSubject && (
                      <>
                        <label className="block text-sm font-semibold text-ink">
                          {resource === 'assessments' ? 'Assessment title' : resource === 'homework' ? 'Homework title' : 'Material title'}
                          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={resource === 'assessments' ? 'e.g. Unit Test 1' : resource === 'homework' ? 'e.g. Solve exercise 3.1' : 'e.g. Thermodynamics notes'} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" />
                        </label>
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
                      </>
                  )}

                  {resource === 'materials' && (
                      <>
                        <label className="block text-sm font-semibold text-ink">
                          Material type
                          <select value={materialType} onChange={(e) => setMaterialType(e.target.value as typeof materialType)} className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-pine">
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
                      </>
                  )}

                  {resource === 'homework' && (
                      <label className="block text-sm font-semibold text-ink">
                        Due date
                        <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" />
                      </label>
                  )}

                  {resource === 'assessments' && (
                      <div className="grid grid-cols-2 gap-4">
                        <label className="block text-sm font-semibold text-ink">
                          Exam date
                          <input required type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" />
                        </label>
                        <label className="block text-sm font-semibold text-ink">
                          Maximum marks
                          <input required type="number" min="1" step="1" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} placeholder="e.g. 50" className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" />
                        </label>
                      </div>
                  )}

                  {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={close} className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper">Cancel</button>
                    <button disabled={isSubmitting} className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-50">{isSubmitting ? 'Saving…' : 'Save record'}</button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  );
}
