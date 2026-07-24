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
---

## Session 7 — 2026-07-24

**Focus:** Attendance API (AttendanceSession + AttendanceRecord CRUD)

### What was done
- Added `src/app/api/attendance/route.ts` — `GET` (admin: all sessions, filterable by
  batchId/subjectId/date/date-range; teacher: own assignment's sessions only, with a
  present/absent summary per session), `POST` (admin or the assigned teacher; creates a
  session + all per-student records in one call, validates roster membership)
- Added `src/app/api/attendance/[id]/route.ts` — `GET` (full detail with per-student
  records; admin: any, teacher: own only), `PATCH` (correct existing records' status,
  admin or assigned teacher), `DELETE` (hard delete, cascades to records)

### Key decisions
- Unlike Assignments/Timetable, **both admin and the assigned teacher** can
  create/view/correct/delete — attendance is something teachers submit and fix
  themselves day-to-day, not an admin-only structural resource
- Relied on the existing `[batchSubjectTeacherId, sessionDate]` unique constraint +
  `apiHandler`'s P2002 → 409 handling for duplicate same-day submissions, same approach
  as Assignments' duplicate-pair handling
- `PATCH` only corrects existing records — can't add a student who wasn't in the
  original roster, since that implies the original session itself was wrong
  (re-submit a new session instead)
- Hard delete, cascading via schema — a session is an event record, not a person, so
  it doesn't follow the Teachers/Students soft-delete pattern
- Teacher list scoping uses `user.sub` correctly from the start, per the Session 5 fix

### Verification
- Not yet run against local DB — pending manual test (see `task.md`)

### What's pending
- Study Material + Homework APIs (next per ROADMAP)
- Manual test pass on Attendance API

---

---

## Session 8 — 2026-07-24

**Focus:** Study Material + Homework APIs

### What was done
- Added `src/app/api/materials/route.ts` + `[id]/route.ts` — full CRUD. List/detail read
  access scoped by the teacher's **current** `BatchSubjectTeacher` assignments; write
  access (edit/delete) scoped by **ownership** (`uploadedBy`) instead, so reassignment
  doesn't lock a teacher out of content they created
- Added `src/app/api/homework/route.ts` + `[id]/route.ts` — same access pattern
  (`assignedBy` for writes). `POST` auto-creates a `HomeworkStatus` row per currently
  active student in the batch. `PATCH` supports bulk status corrections via a `statuses`
  array, reusing the correction pattern from Attendance's `PATCH`

### Key decisions
- **Read vs. write scoping split**: this is new compared to earlier modules. Assignments/
  Timetable/Attendance tie both read and write to the *current* teacher assignment. Here,
  read follows current assignment (what should a teacher currently see for their classes)
  but write follows original ownership (`uploadedBy`/`assignedBy`) — a teacher shouldn't
  lose the ability to fix a typo in homework they created just because they got moved to
  a different batch next term
- Homework roster is a **snapshot at creation time**, not a live query — matches the
  schema's own doc comment on `HomeworkStatus`
- No new file-upload plumbing — both APIs only store `fileUrl`/`filePath`/`externalLink`
  references, assuming upload happens elsewhere
- `materialType: 'link'` requires `externalLink`; other types require `fileUrl` or
  `filePath` — enforced via a Zod `.refine()`

### Verification
- Manually tested via Postman after a full DB reset: create, duplicate-conflict (409),
  list (admin + teacher scoping), detail fetch, status correction via PATCH, delete —
  all confirmed correct once the bug below was fixed

### Bug found & fixed
- `AttendanceSession` has **no Prisma relation field to `BatchSubjectTeacher`** in the
  schema — only the raw `batchSubjectTeacherId` column (unlike `TimetableSlot`, which
  does declare a `bst` relation). The original code assumed a `bst` relation existed
  (copied from the Timetable pattern) and used it in both `include` and `where`, which
  Prisma rejected at query time — a 500 with no useful message surfaced to the client.
  Fixed by resolving `BatchSubjectTeacher` rows manually (a batched lookup for list, a
  single lookup for detail) and attaching them to the response by hand, instead of
  relying on a relation that isn't declared in `schema.prisma`.
### What's pending
- Marks/exams API (last content module per ROADMAP before frontend wiring)
- Manual test pass on Materials + Homework

---

### Verification
- Manually tested via Postman: material create (both valid and validation-failure
  cases), teacher-scoped list, delete-by-uploader; homework create (roster snapshot
  confirmed via seeded pending statuses), list summary, status correction via PATCH,
  rejection of a status update for a student not on the roster, delete — all confirmed correct


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
