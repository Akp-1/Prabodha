'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type RecordStatus = 'Active' | 'Pending';

export type Learner = { id: string; name: string; email: string; section: string; parentName: string; status: RecordStatus };
export type FacultyMember = { id: string; name: string; email: string; subject: string; status: RecordStatus };
export type Batch = { id: string; name: string; lead: string; learnerCount: number };
export type Subject = { id: string; name: string; code: string; faculty: string };
export type TimetableSession = { id: string; day: string; time: string; batch: string; subject: string; faculty: string; room: string };
export type AttendanceEntry = { id: string; date: string; batch: string; subject: string; present: number; total: number; status: 'Submitted' | 'Draft' };
export type Material = { id: string; title: string; batch: string; subject: string; type: 'PDF' | 'Link' | 'Note'; published: string };
export type HomeworkItem = { id: string; title: string; batch: string; subject: string; dueDate: string; status: 'Open' | 'Closed' };
export type Assessment = { id: string; title: string; subject: string; date: string; maximumMarks: number; average: number };

export type InstitutionData = {
  institutionName: string;
  learners: Learner[];
  faculty: FacultyMember[];
  batches: Batch[];
  subjects: Subject[];
  sessions: TimetableSession[];
  attendance: AttendanceEntry[];
  materials: Material[];
  homework: HomeworkItem[];
  assessments: Assessment[];
};

const STORAGE_KEY = 'prabodha-institution-demo-v1';

export const initialInstitutionData: InstitutionData = {
  institutionName: 'Demo Institution',
  learners: [
    { id: 'learner-1', name: 'Aarav Mehta', email: 'aarav@example.com', section: 'Class 11 Science', parentName: 'Rakesh Mehta', status: 'Active' },
    { id: 'learner-2', name: 'Ananya Sharma', email: 'ananya@example.com', section: 'Class 12 Science', parentName: 'Nisha Sharma', status: 'Active' },
    { id: 'learner-3', name: 'Rohan Das', email: 'rohan@example.com', section: 'Class 11 Science', parentName: 'Sanjay Das', status: 'Pending' },
  ],
  faculty: [
    { id: 'faculty-1', name: 'Dr. Meera Iyer', email: 'meera@example.com', subject: 'Physics', status: 'Active' },
    { id: 'faculty-2', name: 'Vikram Rao', email: 'vikram@example.com', subject: 'Chemistry', status: 'Active' },
  ],
  batches: [
    { id: 'batch-1', name: 'Class 11 Science', lead: 'Dr. Meera Iyer', learnerCount: 2 },
    { id: 'batch-2', name: 'Class 12 Science', lead: 'Vikram Rao', learnerCount: 1 },
  ],
  subjects: [
    { id: 'subject-1', name: 'Physics', code: 'PHY-11', faculty: 'Dr. Meera Iyer' },
    { id: 'subject-2', name: 'Chemistry', code: 'CHE-11', faculty: 'Vikram Rao' },
    { id: 'subject-3', name: 'Mathematics', code: 'MAT-11', faculty: 'Unassigned' },
  ],
  sessions: [
    { id: 'session-1', day: 'Monday', time: '09:00 - 10:00', batch: 'Class 11 Science', subject: 'Physics', faculty: 'Dr. Meera Iyer', room: 'Room 1' },
    { id: 'session-2', day: 'Monday', time: '10:15 - 11:15', batch: 'Class 12 Science', subject: 'Chemistry', faculty: 'Vikram Rao', room: 'Room 2' },
  ],
  attendance: [
    { id: 'attendance-1', date: '2026-07-17', batch: 'Class 11 Science', subject: 'Physics', present: 2, total: 2, status: 'Submitted' },
  ],
  materials: [
    { id: 'material-1', title: 'Motion and force notes', batch: 'Class 11 Science', subject: 'Physics', type: 'PDF', published: 'Today' },
    { id: 'material-2', title: 'Chemical bonding revision', batch: 'Class 12 Science', subject: 'Chemistry', type: 'Link', published: 'Yesterday' },
  ],
  homework: [
    { id: 'homework-1', title: 'Practice set: Newton laws', batch: 'Class 11 Science', subject: 'Physics', dueDate: '2026-07-21', status: 'Open' },
  ],
  assessments: [
    { id: 'assessment-1', title: 'Physics Unit Test 1', subject: 'Physics', date: '2026-07-15', maximumMarks: 50, average: 38 },
    { id: 'assessment-2', title: 'Chemistry Quiz', subject: 'Chemistry', date: '2026-07-12', maximumMarks: 20, average: 15 },
  ],
};

type StoreValue = {
  data: InstitutionData;
  ready: boolean;
  update: (updater: (current: InstitutionData) => InstitutionData) => void;
  reset: () => void;
};

const InstitutionStoreContext = createContext<StoreValue | null>(null);

export function createRecordId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function InstitutionStore({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<InstitutionData>(initialInstitutionData);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setData(JSON.parse(saved) as InstitutionData);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  const value = useMemo<StoreValue>(() => ({
    data,
    ready,
    update: (updater) => setData((current) => updater(current)),
    reset: () => setData(initialInstitutionData),
  }), [data, ready]);

  return <InstitutionStoreContext.Provider value={value}>{children}</InstitutionStoreContext.Provider>;
}

export function useInstitutionStore() {
  const store = useContext(InstitutionStoreContext);
  if (!store) throw new Error('useInstitutionStore must be used inside InstitutionStore');
  return store;
}
