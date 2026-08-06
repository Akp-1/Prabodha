# Implementation Plan — Parent Marks Access

## Goal
Add parent role support to `marks/page.tsx` — the last of the four pages flagged as missing
ParentStudentLink-based access (Attendance/Materials/Homework already done; Marks was next).

## Changes

1. **`src/app/api/exams/route.ts`**
   - `requireRole` now includes `'parent'`.
   - Resolve linked children via `ParentStudentLink` and scope the exam query to their
     batches — same pattern as Attendance/Homework/Materials.
   - `marks` select now includes `student: { select: { name: true } }` for multi-child
     disambiguation.
   - New `hideMarksExceptChildren` helper (parent equivalent of `hideOthersMarks`): filters
     each exam's `marks` array down to the parent's own children, sets `myMark` when exactly
     one child has a mark for that exam.

2. **`src/app/(dashboard)/dashboard/marks/page.tsx`**
   - Split into `MarksPage` (role dispatch) → `ParentMarksView` (new) or `ManagedMarksView`
     (existing admin/teacher/student flow, unchanged in behavior).
   - `ParentMarksView`: read-only list of exams with the selected child's mark, sourced from
     `/api/parent-dashboard` (children list) + `/api/exams` (now parent-scoped). Shows a child
     selector when a parent has more than one linked student.
   - Both views' manual headers replaced with the shared `DashboardHeader`.

3. **`Sidebar.tsx`**: added `'parent'` to the Marks nav item's roles.

## Non-goals
- No change to `/api/exams/[id]` (grading detail) — parents don't need it; the list view's
  `myMark`/`marks` is sufficient, same as the existing student view.

## Verification
- `npm run lint`, `npx tsc --noEmit` — confirmed the new parent-scoping code in
  `exams/route.ts` only adds errors of the same pre-existing class already present in that
  file (sandbox Prisma-engine fallback), file-level error set unchanged from baseline.
