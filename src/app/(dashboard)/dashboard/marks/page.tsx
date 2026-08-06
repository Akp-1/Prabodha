'use client';

import { useEffect, useState } from 'react';
import { Award, Plus, Save, X } from 'lucide-react';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/components/auth/AuthProvider';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

type Exam = {
  id: string;
  name: string;
  examDate: string;
  maxMarks: number;
  batch: { id: string; name: string } | null;
  subject: { id: string; name: string } | null;
  summary: { studentsGraded: number; average: number | null };
  myMark?: { marksObtained: number; remarks: string | null } | null;
  /** Present (parent-scoped, filtered to linked children) only in the
   * `/api/exams` list response for the parent role — see
   * hideMarksExceptChildren in src/app/api/exams/route.ts. */
  marks?: { studentId: string; marksObtained: number; remarks: string | null; student?: { name: string } }[];
};

type ExamDetail = Exam & {
  marks: { studentId: string; marksObtained: number; remarks: string | null; student: { id: string; name: string } }[];
};

type Batch = { id: string; name: string };
type Subject = { id: string; name: string };
type Student = { id: string; name: string };
interface LinkedChild { student: { id: string; name: string; batch: { name: string } | null } }

export default function MarksPage() {
  const { user } = useAuth();
  if (user?.role === 'parent') return <ParentMarksView />;
  return <ManagedMarksView />;
}

// ---------------------------------------------------------------------------
// Parent: read-only view per linked child — picks the selected child's mark
// out of each exam's (already parent-scoped) `marks` array, the same way the
// student view already picks out `myMark`. See hideMarksExceptChildren in
// src/app/api/exams/route.ts for the server-side scoping this relies on.
// ---------------------------------------------------------------------------

function ParentMarksView() {
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [childData, examData] = await Promise.all([
          apiFetch<LinkedChild[]>('/api/parent-dashboard'),
          apiFetch<Exam[]>('/api/exams'),
        ]);
        setChildren(childData);
        if (childData.length) setSelectedChildId(childData[0].student.id);
        setExams(examData);
      } catch (err) {
        setLoadError(err instanceof ApiClientError ? err.message : 'Failed to load assessments.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const examsWithChildMark = exams.map((e) => ({
    ...e,
    myMark: e.marks?.find((m) => m.studentId === selectedChildId) ?? null,
  }));

  return (
      <div className="max-w-[1040px]">
        <DashboardHeader
            title="Marks & assessments"
            action={
              children.length > 1 ? (
                  <select
                      value={selectedChildId}
                      onChange={(e) => setSelectedChildId(e.target.value)}
                      className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold"
                  >
                    {children.map((c) => (
                        <option key={c.student.id} value={c.student.id}>{c.student.name}</option>
                    ))}
                  </select>
              ) : undefined
            }
        />
        <p className="text-ink-soft mb-6 max-w-[640px]">Results for every graded assessment.</p>

        {loadError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{loadError}</div>}

        {isLoading ? (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">Loading assessments…</div>
        ) : children.length === 0 ? (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">
              No children have been linked to your account yet. Please ask your institute admin to link your child&apos;s profile to your parent account.
            </div>
        ) : exams.length ? (
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <div className="divide-y divide-line">
                {examsWithChildMark.map((exam) => (
                    <div key={exam.id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-pine/10 text-pine"><Award size={17} /></div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-ink truncate">{exam.name}</div>
                          <div className="text-xs text-ink-soft">{exam.subject?.name ?? '—'} · {exam.batch?.name ?? '—'} · {exam.examDate.slice(0, 10)}</div>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-pine flex-shrink-0">
                        {exam.myMark ? `${exam.myMark.marksObtained} / ${exam.maxMarks}` : 'Not graded yet'}
                      </span>
                    </div>
                ))}
              </div>
            </div>
        ) : (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">No assessments have been recorded yet.</div>
        )}
      </div>
  );
}

// ---------------------------------------------------------------------------
// Admin / Teacher / Student: existing create + grade + self-view flow.
// ---------------------------------------------------------------------------

function ManagedMarksView() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'teacher';

  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [batchOptions, setBatchOptions] = useState<Batch[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<Subject[]>([]);
  const [name, setName] = useState('');
  const [batchId, setBatchId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [maxMarks, setMaxMarks] = useState('');

  // Grading panel state
  const [gradingExam, setGradingExam] = useState<ExamDetail | null>(null);
  const [roster, setRoster] = useState<Student[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [isSavingGrades, setIsSavingGrades] = useState(false);

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<Exam[]>('/api/exams');
      setExams(data);
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Failed to load assessments.');
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
        const [batches, subjects] = await Promise.all([
          apiFetch<Batch[]>('/api/batches'),
          apiFetch<Subject[]>('/api/subjects'),
        ]);
        setBatchOptions(batches);
        setSubjectOptions(subjects);
      } catch {
        // Non-fatal.
      }
    })();
  }, [canManage]);

  function closeCreateForm() {
    setName('');
    setBatchId('');
    setSubjectId('');
    setExamDate('');
    setMaxMarks('');
    setCreateError(null);
    setShowCreateForm(false);
  }

  async function submitCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);
    try {
      await apiFetch('/api/exams', {
        method: 'POST',
        body: JSON.stringify({ batchId, subjectId, name: name.trim(), examDate, maxMarks: Number(maxMarks) }),
      });
      closeCreateForm();
      await load();
    } catch (err) {
      setCreateError(err instanceof ApiClientError ? err.message : 'Failed to create assessment.');
    } finally {
      setIsCreating(false);
    }
  }

  async function openGrading(exam: Exam) {
    setGradeError(null);
    try {
      const [detail, students] = await Promise.all([
        apiFetch<ExamDetail>(`/api/exams/${exam.id}`),
        apiFetch<Student[]>(`/api/students?batchId=${exam.batch?.id}`),
      ]);
      setGradingExam(detail);
      setRoster(students);
      const initial: Record<string, string> = {};
      for (const m of detail.marks) initial[m.studentId] = String(m.marksObtained);
      setScores(initial);
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Failed to open grading.');
    }
  }

  function closeGrading() {
    setGradingExam(null);
    setRoster([]);
    setScores({});
    setGradeError(null);
  }

  async function saveGrades() {
    if (!gradingExam) return;
    setGradeError(null);
    setIsSavingGrades(true);
    try {
      const marks = Object.entries(scores)
          .filter(([, value]) => value.trim() !== '')
          .map(([studentId, value]) => ({ studentId, marksObtained: Number(value) }));
      if (!marks.length) throw new ApiClientError(400, 'Enter at least one score before saving.');
      await apiFetch(`/api/exams/${gradingExam.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ marks }),
      });
      closeGrading();
      await load();
    } catch (err) {
      setGradeError(err instanceof ApiClientError ? err.message : 'Failed to save grades.');
    } finally {
      setIsSavingGrades(false);
    }
  }

  return (
      <div className="max-w-[1040px]">
        <DashboardHeader
            title="Marks & assessments"
            action={
              canManage ? (
                  <button onClick={() => setShowCreateForm(true)} className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep whitespace-nowrap">
                    <Plus size={17} />
                    Create assessment
                  </button>
              ) : undefined
            }
        />
        <p className="text-ink-soft mb-6 max-w-[640px]">
          {canManage ? 'Record assessments and enter scores for each learner.' : 'Your results for every assessment, as they are graded.'}
        </p>

        {loadError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{loadError}</div>}

        {isLoading ? (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">Loading assessments…</div>
        ) : exams.length ? (
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <div className="divide-y divide-line">
                {exams.map((exam) => (
                    <div key={exam.id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-pine/10 text-pine"><Award size={17} /></div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-ink truncate">{exam.name}</div>
                          <div className="text-xs text-ink-soft">{exam.subject?.name ?? '—'} · {exam.batch?.name ?? '—'} · {exam.examDate.slice(0, 10)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {canManage ? (
                            <>
                      <span className="text-xs font-semibold text-ink-soft">
                        {exam.summary.studentsGraded} graded · avg {exam.summary.average !== null ? exam.summary.average.toFixed(1) : '—'} / {exam.maxMarks}
                      </span>
                              <button onClick={() => openGrading(exam)} className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-paper">Enter marks</button>
                            </>
                        ) : (
                            <span className="text-sm font-semibold text-pine">
                      {exam.myMark ? `${exam.myMark.marksObtained} / ${exam.maxMarks}` : 'Not graded yet'}
                    </span>
                        )}
                      </div>
                    </div>
                ))}
              </div>
            </div>
        ) : (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center text-sm text-ink-soft">
              {canManage ? 'No assessments created yet.' : 'No assessments have been recorded for your batch yet.'}
            </div>
        )}

        {showCreateForm && (
            <div className="fixed inset-0 z-20 flex items-center justify-center bg-pine-deep/35 px-4">
              <div className="w-full max-w-[500px] rounded-xl border border-line bg-white p-7 shadow-xl">
                <div className="flex justify-between gap-4 mb-6">
                  <div>
                    <div className="font-display text-[22px] font-semibold">Create assessment</div>
                    <p className="mt-1 text-sm text-ink-soft">Set up an exam before entering scores.</p>
                  </div>
                  <button onClick={closeCreateForm} aria-label="Close form" className="p-1.5 text-ink-soft hover:bg-paper rounded-md"><X size={18} /></button>
                </div>
                <form onSubmit={submitCreate} className="space-y-4">
                  <label className="block text-sm font-semibold text-ink">
                    Title
                    <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Unit Test 1" className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" />
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

                  {createError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</div>}

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={closeCreateForm} className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper">Cancel</button>
                    <button disabled={isCreating} className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-50">{isCreating ? 'Saving…' : 'Create'}</button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {gradingExam && (
            <div className="fixed inset-0 z-20 flex items-center justify-center bg-pine-deep/35 px-4">
              <div className="w-full max-w-[540px] max-h-[85vh] overflow-y-auto rounded-xl border border-line bg-white p-7 shadow-xl">
                <div className="flex justify-between gap-4 mb-6">
                  <div>
                    <div className="font-display text-[22px] font-semibold">{gradingExam.name}</div>
                    <p className="mt-1 text-sm text-ink-soft">Out of {gradingExam.maxMarks} marks. Leave a field blank to skip a student for now.</p>
                  </div>
                  <button onClick={closeGrading} aria-label="Close" className="p-1.5 text-ink-soft hover:bg-paper rounded-md"><X size={18} /></button>
                </div>

                <div className="space-y-3">
                  {roster.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-4">
                        <span className="text-sm font-semibold text-ink">{s.name}</span>
                        <input
                            type="number"
                            min="0"
                            max={gradingExam.maxMarks}
                            value={scores[s.id] ?? ''}
                            onChange={(e) => setScores((current) => ({ ...current, [s.id]: e.target.value }))}
                            placeholder="—"
                            className="w-24 rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-pine"
                        />
                      </div>
                  ))}
                  {!roster.length && <p className="text-sm text-ink-soft">No students in this batch yet.</p>}
                </div>

                {gradeError && <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{gradeError}</div>}

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={closeGrading} className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper">Cancel</button>
                  <button onClick={saveGrades} disabled={isSavingGrades} className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-50">
                    <Save size={16} />
                    {isSavingGrades ? 'Saving…' : 'Save grades'}
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}