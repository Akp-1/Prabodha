# Prabodha — Development Log

> This file tracks every development session with dates, what was done, and key decisions made. Kept for future reference.

---

## Session 1 — 2026-07-23 (Afternoon)

**Focus:** Project Cleanup & Reorganization

### What was done
- Audited all 46 root-level files + 7 directories
- Archived 14 legacy Express `.js` files → `docs/legacy-reference/express/`
- Archived 4 raw SQL schema files → `docs/legacy-reference/sql/`
- Archived 5 design prototypes (HTML + PNG) → `docs/design-prototypes/`
- Relocated 3 GitHub config files (`ci.yml`, issue templates) to `.github/`
- Deleted duplicate API route `register-institution` (kept `register-institute`)
- Deleted stale `mnt/` directory (old AI tool output)
- Updated `README.md` — clean project structure, V1 scope, local dev instructions
- Updated `agent.md` — removed dual-backend references, updated architecture

### Verification
- `npm run lint` → ✅ passed
- `npm run build` → ✅ 15 pages, 7 API routes, zero errors

### Key decisions
- Legacy Express files **archived** (not deleted) — business logic is useful for reference when building Next.js equivalents
- `register-institute` kept over `register-institution` — matches Prisma model name `Institute`
- `vector-classes-website.html` archived with other prototypes

### Result
- Root: 46 files → 13 files
- Root: 7 dirs → 8 dirs (added `docs/`, `.github/`)

---

## Session 2 — 2026-07-23 (Evening)

**Focus:** Status Review & Planning Next Phase

### What was done
- Full inventory of all completed work across the project
- Created comprehensive walkthrough documenting both phases
- Identified all remaining V1 build targets
- Created task list and implementation plan for next development phase

### Current state snapshot
- **Auth API:** 7 endpoints functional (register, login, logout, me, create-user, forgot/reset-password)
- **Prisma schema:** 13 models, 4 enums — covers all V1 modules
- **Dashboard UI:** 11 pages with working client-side mock data (localStorage)
- **Components:** 6 reusable components (Sidebar, TopBar, StatCard, DirectoryPage, AdminResourcePage, InstitutionStore)
- **Design system:** Custom pine/saffron/paper palette, 3 font families, Tailwind config
- **Git:** Not initialized (`.git/` directory empty)

### Key decisions
- **Database:** SQLite for local dev (zero install), PostgreSQL for production VPS. MongoDB ruled out (NoSQL doesn't fit relational schema).
- **Priority:** Batches + Subjects APIs first (foundation entities)
- **Delete behavior:** Soft delete for people (`isActive=false`), hard delete for structure (batches/subjects)
- **Teacher access:** Replicate legacy teacher-scoped student access
- **Approach:** API-first — build routes today, wire dashboard next session
- **Git:** Initialized, connected to `https://github.com/Akp-1/Prabodha.git`, first commit pushed (75 files, 12,291 lines)

### Git setup
- Initialized repo, created `.gitignore`
- Remote: `origin` → `https://github.com/Akp-1/Prabodha.git`
- First commit: `5a266e9` — "initial commit: clean project scaffold with auth API, dashboard shell, and Prisma schema"
- Pushed to `main` branch

### What's pending (deferred to next session)
- Teachers + Students CRUD APIs (with teacher-scoped access)
- Wire dashboard pages from localStorage mock → real Prisma-backed API calls
- Timetable, Attendance, Materials, Homework APIs

---
---

## Session 3 — 2026-07-23 (Night)

**Focus:** Teachers API (CRUD, soft-delete)

### What was done
- Added `src/app/api/teachers/route.ts` — `GET` (list, active-only by default,
  `?includeInactive=true` opt-in), `POST` (admin-only, creates `User` with `role: 'teacher'`)
- Added `src/app/api/teachers/[id]/route.ts` — `GET`, `PATCH` (admin-only), `DELETE` (admin-only)
- Followed the existing `subjects`/`batches` route conventions exactly:
  `apiHandler` + `requireAuth`/`requireRole` from `lib/rbac.ts`, Zod schemas, institute-scoped queries

### Key decisions
- Teachers are `User` rows filtered by `role: 'teacher'` — no new Prisma model
- `DELETE` follows the "soft delete for people" decision from Session 2: flips `isActive`
  to `false` instead of removing the row (teachers are referenced by attendance, homework,
  study material, batch/subject assignments)
- All responses use an explicit `select` to exclude `passwordHash`
- Email/password change left out of scope for this task

### Verification
- Not yet run against local DB — pending `npm run dev` + manual endpoint test (see `task.md`)

### What's pending
- Students CRUD API (same pattern, teacher-scoped access per legacy behavior)
- Manual/automated test pass on Teachers API

---

---

## Session 4 — 2026-07-24

**Focus:** Students API (CRUD, soft-delete, teacher-scoped access)

### What was done
- Added `src/app/api/students/route.ts` — `GET` (admin: all students, optional `?batchId=`;
  teacher: scoped to batches they teach via `BatchSubjectTeacher`), `POST` (admin-only)
- Added `src/app/api/students/[id]/route.ts` — `GET` (admin: any; teacher: only if they teach
  the student's batch, else 403), `PATCH` (admin-only), `DELETE` (admin-only, soft-delete)

### Key decisions
- Students are `User` rows filtered by `role: 'student'` — no new Prisma model
- Implemented the Session 2 "Teacher access: Replicate legacy teacher-scoped student access"
  item: teacher's student list/detail access is derived from `BatchSubjectTeacher` assignments,
  not a separate permissions table
- A teacher requesting a `batchId` they don't teach gets an empty list (not an error) on the
  list endpoint, but a 403 on the detail endpoint — list is a filter, detail is an access check
- `DELETE` soft-deletes (`isActive: false`) per the existing "soft delete for people" decision
- All responses use an explicit `select` to exclude `passwordHash`

### Verification
- Manually tested via Postman against local SQLite DB: admin create/list, teacher-scoped list and detail fetch
  both confirmed correct (200 when assigned via `BatchSubjectTeacher`, empty list / 403 when the assignment
  row was removed in Prisma Studio)
- 
### What's pending
- Parent-side access to linked students (via `ParentStudentLink`)
- Manual/automated test pass on Students API, including the teacher-scoping edge cases

---
---

## Session 5 — 2026-07-24

**Focus:** Assignments API (BatchSubjectTeacher CRUD)

### What was done
- Added `src/app/api/assignments/route.ts` — `GET` (admin: all, filterable by
  batchId/subjectId/teacherId; teacher: own assignments only), `POST` (admin-only,
  validates batch/subject/teacher belong to institute + teacher is active)
- Added `src/app/api/assignments/[id]/route.ts` — `GET` (admin: any; teacher: own
  only, else 403), `PATCH` (admin-only, reassign teacher), `DELETE` (admin-only, hard delete)
- This replaces the manual Prisma Studio workaround used in Session 4's testing to
  link a teacher to a batch/subject for verifying student-scoping

### Key decisions
- `DELETE` is a **hard** delete (not soft), following the Session 2 decision:
  "hard delete for structure (batches/subjects)" — `BatchSubjectTeacher` is a
  structural link, not a person
- Relied on the existing `[batchId, subjectId]` unique constraint + `apiHandler`'s
  existing P2002 → 409 handling for duplicate-assignment conflicts, rather than a
  manual pre-check — avoids a race condition between check and create
- `PATCH` only allows reassigning `teacherId` — batch/subject together are the
  row's identity, so changing either is treated as delete + re-create
- Teachers can list/fetch only their own assignments; the `teacherId` query filter
  is ignored for teacher callers so they can't probe other teachers' assignments

### Verification
- Manually tested via Postman: create, duplicate-conflict (409), admin/teacher list scoping,
  detail fetch, delete, and re-fetch-after-delete (404) — all confirmed correct

### Bug found & fixed
- `requireAuth` returns a `TokenPayload` with the current user's id on `.sub`, not `.id`.
  Four places across `students/route.ts`, `students/[id]/route.ts`, `assignments/route.ts`,
  and `assignments/[id]/route.ts` used `user.id` (always `undefined`) instead of `user.sub`.
  For Prisma `where` filters this failed silently — an `undefined` field is treated as "no
  filter," so teacher-scoped student/assignment lists were actually returning unscoped
  results. For direct equality checks (`assignment.teacherId !== user.id`) it failed loudly
  as a permanent 403. Caught while testing the Assignments detail route, then traced back
  and fixed in all four call sites; re-verified the Students teacher-scoping tests afterward
  since the earlier "pass" was a false positive.


### What's pending
- Timetable API (builds directly on `BatchSubjectTeacher` via `TimetableSlot`)
- Manual test pass on Assignments API

---

---

## Session 6 — 2026-07-24

**Focus:** Timetable API (TimetableSlot CRUD, conflict detection)

### What was done
- Added `src/app/api/timetable/route.ts` — `GET` (admin: all slots, filterable by
  batchId/dayOfWeek; teacher: own schedule only), `POST` (admin-only, validates the
  assignment + rejects overlapping teacher/batch/classroom bookings)
- Added `src/app/api/timetable/[id]/route.ts` — `GET` (admin: any; teacher: own only,
  else 403), `PATCH` (admin-only, day/time/classroom only, re-checks conflicts),
  `DELETE` (admin-only, hard delete)

### Key decisions
- `startTime`/`endTime` accepted/returned as `"HH:MM"` strings over the API; stored
  internally as `DateTime` pinned to a fixed reference date (`1970-01-01`), since SQLite
  has no time-only column type
- Conflict detection (teacher/batch/classroom double-booking on the same day) is done in
  application code by fetching same-day slots and checking overlap — no native time-range
  query available in SQLite at this scale
- `batchSubjectTeacherId` is not editable via `PATCH`, same reasoning as Assignments'
  batch/subject fields — it's the row's identity, not an editable attribute
- `DELETE` is a hard delete — structural, not a person, same as Assignments
- Correctly used `user.sub` (not `user.id`) for teacher-scoping from the start, per the
  Session 5 bug fix

### Verification
- Manually tested via Postman: create, teacher-double-booking conflict (409), boundary
  case (back-to-back slots with touching but non-overlapping times succeed), admin/teacher
  list scoping, detail fetch, classroom update, conflict-on-update (409), delete, and
  re-fetch-after-delete (404) — all confirmed correct

### What's pending
- Attendance API (next natural layer — attendance sessions reference timetable/BST)
- Manual test pass on Timetable API, including all three conflict types

---

## Session 7 — 2026-07-24

**Focus:** Wire Dashboard UI to Real API Endpoints

### What was done
- Created `src/lib/api-client.ts` — a client-side `fetch()` wrapper that auto-attaches the JWT `Authorization: Bearer` header from localStorage. All dashboard pages import this instead of calling `fetch()` directly.
- **Main Dashboard** (`dashboard/page.tsx`): Replaced hardcoded `MOCK_STATS` with real `fetch()` calls to `/api/students`, `/api/teachers`, and `/api/batches`. The "Getting Started" checklist now auto-checks based on whether real data exists in the database.
- **DirectoryPage** (`components/dashboard/DirectoryPage.tsx`): Replaced `useInstitutionStore` with `apiFetch()` calls to `/api/teachers` and `/api/students`. The create form now `POST`s to the real API with a temporary default password (`Welcome@123`).
- **AdminResourcePage** (`components/dashboard/AdminResourcePage.tsx`): Replaced localStorage-backed batches/subjects with `apiFetch()` calls to `/api/batches` and `/api/subjects`. Materials, homework, and assessments remain on `InstitutionStore` since those APIs don't exist yet.
- **Timetable Page** (`dashboard/timetable/page.tsx`): Replaced `InstitutionStore.sessions` with `apiFetch()` calls to `/api/timetable`. The create form was redesigned: instead of three separate dropdowns (batch, subject, faculty), it now uses a single assignment dropdown populated from `/api/assignments` (e.g., "Physics → Class 11 Science (Dr. Meera Iyer)"), matching the API's `batchSubjectTeacherId` requirement.
- Updated `ROADMAP.md` with two new tasks: "Password Input on Create Forms" and "Login Page".

### Key decisions
- `InstitutionStore` is **not yet removable** from `(dashboard)/layout.tsx` — it's still required by Attendance, Materials, Homework, Marks, and Settings pages which have no API.
- Temporary password (`Welcome@123`) used for teacher/student creation until a proper password input is added (tracked in ROADMAP).
- Timetable form consolidated from 3 dropdowns to 1 assignment dropdown — correct per schema design.
- All API-backed pages show a "Loading…" state while data is being fetched.

### Verification
- `npm run build` → ✅ passed (15 pages, 21 API routes, zero TypeScript errors)
- One lint warning in `AdminResourcePage.tsx` (unnecessary dependency in `useMemo`) — non-blocking

### What's pending
- Build a proper Login Page that stores the JWT token
- Add password field to teacher/student create forms
- Wire remaining pages (Attendance, Materials, Homework, Marks, Settings) once their APIs are built

---

<!-- Future sessions: copy the template below -->
<!--
## Session N — YYYY-MM-DD

**Focus:** [One-line summary]

### What was done
- ...

### Verification
- ...

### Key decisions
- ...
-->
