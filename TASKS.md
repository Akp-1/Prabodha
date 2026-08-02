# Prabodha — Pending Tasks for Contributors

> **Last updated:** 2026-07-26 (Session 10)
> **Status:** Phases 1–2 complete. Phases 3–7 have open tasks.
> **Before starting:** Read `agent.md`, `ROADMAP.md`, `LOG.md`, and `docs/contributor-guide.md`.

---

## How to Pick a Task

1. Each task below is **self-contained** — it lists the files to create/modify, the Prisma models involved, and the API patterns to follow.
2. Pick a task, create an `implementation_plan.md`, get it approved, then build.
3. Follow the established patterns exactly — look at any existing route under `src/app/api/` for reference.
4. Run `npm run build` and `npm run lint` before considering any task done.
5. Update `LOG.md`, `ROADMAP.md`, and `docs/api-reference.md` when you finish a task.

---

## Task A: Attendance API ⬅️ HIGH PRIORITY

**Difficulty:** Medium | **Depends on:** Assignments API (done), Students API (done)
**Prisma models:** `AttendanceSession`, `AttendanceRecord`
**Reference:** `prisma/schema.prisma` lines 204–235

### What to build

#### A1. `src/app/api/attendance/route.ts`
- `GET` — List attendance sessions. Admin: all (filterable by `?batchSubjectTeacherId=`, `?date=`). Teacher: only sessions they marked (`markedBy = user.sub`).
- `POST` — Teacher or Admin. Creates an `AttendanceSession` + bulk `AttendanceRecord` rows in a single request. Body:
  ```json
  {
    "batchSubjectTeacherId": "cuid",
    "sessionDate": "2026-07-26",
    "records": [
      { "studentId": "cuid", "status": "present" },
      { "studentId": "cuid", "status": "absent" }
    ]
  }
  ```
  - Validate the assignment exists and belongs to `user.instituteId`.
  - Teacher callers: verify `assignment.teacherId === user.sub`.
  - Use `prisma.$transaction()` to create session + all records atomically.
  - Duplicate check: `@@unique([batchSubjectTeacherId, sessionDate])` handles it → P2002 → 409.
  - Validate all `studentId`s belong to the assignment's batch.

#### A2. `src/app/api/attendance/[id]/route.ts`
- `GET` — Fetch session detail with all records (student names + statuses).
- `PATCH` — Teacher/Admin. Update individual student statuses within an existing session. Body: `{ records: [{ studentId, status }] }`.
- `DELETE` — Admin-only. Hard delete (structural).

### Edge cases to test
- Creating two sessions for the same assignment+date → 409
- Teacher creating a session for someone else's assignment → 403
- Student ID not in the assignment's batch → 400
- Empty records array → 400

---

## Task B: Attendance UI ⬅️ HIGH PRIORITY

**Difficulty:** Medium-Hard | **Depends on:** Task A (Attendance API)
**Files:** `src/components/dashboard/AttendancePage.tsx`, update `src/app/(dashboard)/dashboard/attendance/page.tsx`

### What to build
- Replace the existing mock attendance page with a real API-backed component.
- **Admin view:** Select a batch-subject-teacher assignment from a dropdown, pick a date, see the student list with present/absent toggles, submit.
- **Teacher view:** Same but auto-filtered to the teacher's own assignments.
- **Session history:** A table below the form showing past sessions with date, batch, subject, and attendance counts (e.g. "18/22 present").
- Follow the same design system as `DirectoryPage` and `ParentsPage`.

---

## Task C: Study Materials API

**Difficulty:** Medium | **Depends on:** Batches, Subjects, Teachers APIs (all done)
**Prisma model:** `StudyMaterial`
**Reference:** `prisma/schema.prisma` lines 241–263

### What to build

#### C1. `src/app/api/materials/route.ts`
- `GET` — Admin: all materials (filterable by `?batchId=`, `?subjectId=`). Teacher: only materials they uploaded OR materials for batches they teach. Student: only materials for their batch.
- `POST` — Teacher or Admin. Body:
  ```json
  {
    "batchId": "cuid",
    "subjectId": "cuid",
    "title": "Chapter 5 Notes",
    "description": "Optional",
    "materialType": "link",
    "externalLink": "https://example.com/notes.pdf"
  }
  ```
  - `materialType` must be one of: `pdf`, `image`, `note`, `link`.
  - For V1, only support `link` and `note` types (no file upload). `fileUrl` and `filePath` remain null.
  - Validate batch and subject belong to `user.instituteId`.
  - Set `uploadedBy = user.sub`.

#### C2. `src/app/api/materials/[id]/route.ts`
- `GET` — Detail view.
- `PATCH` — Admin or uploader. Update title/description/link.
- `DELETE` — Admin or uploader. Hard delete.

---

## Task D: Study Materials UI

**Difficulty:** Medium | **Depends on:** Task C (Materials API)
**Files:** `src/components/dashboard/MaterialsPage.tsx`, update `src/app/(dashboard)/dashboard/materials/page.tsx`

### What to build
- A card-grid or table listing materials, filterable by batch and subject.
- "Add material" modal: select batch + subject, enter title, description, material type, and external link.
- Each card shows: title, type badge, subject, batch, uploader name, date.
- Click to open the link or view note content.

---

## Task E: Homework UI

**Difficulty:** Medium | **Depends on:** Homework API (already exists — check `ROADMAP.md`)
**Files:** `src/components/dashboard/HomeworkPage.tsx`, update `src/app/(dashboard)/dashboard/homework/page.tsx`

### What to build
- **Teacher/Admin view:** List assigned homework, create new homework (select batch + subject, title, description, due date).
- **Student view:** List homework assigned to their batch with status (pending/completed).
- **Parent view:** List homework for linked students with their completion status.
- Homework creation should auto-create `HomeworkStatus` rows for every student in the batch (use a transaction).

---

## Task F: Marks/Grades API & UI

**Difficulty:** Medium-Hard | **Depends on:** Batches, Subjects, Students APIs (all done)
**Note:** The Prisma schema does NOT yet have a Marks/Grades model. This task includes schema design.

### What to build
1. **Schema design:** Add a `Mark` or `Assessment` model to `prisma/schema.prisma`. Suggested fields:
   - `id`, `instituteId`, `batchId`, `subjectId`, `studentId`, `title` (e.g. "Midterm Exam"), `maxMarks`, `obtainedMarks`, `date`, `createdBy`, `createdAt`.
   - Run `npx prisma migrate dev` after adding.
2. **API:** Standard CRUD at `/api/marks`.
3. **UI:** A marks entry page where teachers can select batch + subject + assessment title, then enter marks for each student in a table.

---

## Task G: Dashboard Wiring Cleanup

**Difficulty:** Easy | **Depends on:** Nothing
**Files:** `src/components/dashboard/AdminResourcePage.tsx`, `src/app/(dashboard)/layout.tsx`

### What to do
- The `DirectoryPage` (Teachers/Students) is already wired to real APIs.
- `AdminResourcePage` for Batches/Subjects is already wired to real APIs.
- BUT `AdminResourcePage` still uses `InstitutionStore` for Materials, Homework, and Assessments tabs.
- Once Tasks C/E/F are done, replace the remaining `InstitutionStore` references with `apiFetch()` calls.
- When all pages are wired, **remove `InstitutionStore`** from `(dashboard)/layout.tsx` and delete `src/components/dashboard/InstitutionStore.tsx`.

---

## Task H: Timetable UI Enhancement

**Difficulty:** Medium | **Depends on:** Timetable API (done)
**Files:** `src/app/(dashboard)/dashboard/timetable/page.tsx`

### What to do
- The current timetable page has a create form + flat list.
- Add a **weekly grid view**: columns = days (Mon–Sat), rows = time slots. Each cell shows Subject + Teacher + Classroom.
- Admin can click a cell to create/edit a slot.
- Teacher view: auto-filtered to their assignments, read-only.

---

## Quick Reference: Established Patterns

| Pattern | Example file |
|---|---|
| API route structure | `src/app/api/teachers/route.ts` |
| Detail route with [id] | `src/app/api/teachers/[id]/route.ts` |
| Client-side fetch | `src/lib/api-client.ts` (`apiFetch()`) |
| Auth + RBAC | `src/lib/rbac.ts` (`apiHandler`, `requireAuth`, `requireRole`) |
| Directory-style UI | `src/components/dashboard/DirectoryPage.tsx` |
| Modal-heavy UI | `src/components/dashboard/ParentsPage.tsx` |
| Zod validation | Every POST/PATCH route file |
| Soft delete (people) | `src/app/api/teachers/[id]/route.ts` DELETE handler |
| Hard delete (structure) | `src/app/api/parent-student-links/[id]/route.ts` DELETE handler |
