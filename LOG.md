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

---

## Session 9 — 2026-07-24

**Focus:** Marks/Exams schema + API, first code-quality refactor pass

### What was done
- **Schema**: added `Exam` and `Mark` models (Module 11 — this didn't exist before
  this session, unlike every prior module which had schema already in place). Added
  back-relations to `Institute`, `User`, `Batch`, `Subject`. Applied via
  `npx prisma db push`.
- **Refactor**: extracted `src/lib/content-scope.ts` — shared teacher
  scoping/ownership helpers (`teacherContentScope`, `requireCurrentlyAssigned`,
  `canReadContent`, `canWriteContent`), replacing the hand-rolled, slightly
  inconsistent versions duplicated across Materials and Homework in Session 8.
- Added `src/app/api/exams/route.ts` + `[id]/route.ts` — full CRUD, using the new
  shared helper. `GET` list includes a computed `{ studentsGraded, average }`
  summary. `PATCH`'s `marks` field is an upsert (create-or-correct), differing
  deliberately from Attendance/Homework's correction-only pattern since there's no
  pre-created Mark roster to correct against.

### Key decisions
- **This module needed new schema** — flagged explicitly rather than silently
  building on top of something that didn't exist. Always check the schema before
  assuming an API-only task.
- **Code quality**: chose to extract `content-scope.ts` now, while adding the third
  consumer of this pattern, rather than waiting longer. Deliberately did **not**
  retrofit Materials/Homework in the same session — kept the diff focused on Marks,
  logged the retrofit as a separate follow-up instead of scope-creeping this session
- Marks bounds (`0 ≤ marksObtained ≤ maxMarks`) enforced in the API layer; SQLite has
  no CHECK constraint support via Prisma
- Lowering an exam's `maxMarks` below an already-recorded score is rejected, not
  silently truncated — protects existing grades from an accidental edit

### Verification
- Manually tested via Postman: exam create, mark entry, over-max-marks rejection (400),
  mark correction via upsert, maxMarks-lowering-below-existing-score rejection (400),
  detail fetch, summary/average calculation, delete, re-fetch-after-delete (404) —
  all confirmed correct
- 
### What's pending
- Retrofit Materials (`src/app/api/materials/`) and Homework
  (`src/app/api/homework/`) to use `src/lib/content-scope.ts` instead of their
  original hand-rolled logic — pure refactor, no behavior change expected
- Manual test pass on Exams/Marks API
- This was the last content module per ROADMAP Phase 4 — Phase 5 (role-specific
  dashboards) and frontend wiring are the natural next pieces

---
### Update — 2026-07-24 (later same day)
Finished the remaining scope of `AdminResourcePage`: Materials, Homework, and
Assessments (`/api/exams`) are now wired to their real APIs too, closing out
"Dashboard Wiring (Admin)" completely — all 5 resource kinds in that component now
read/write real data, none left on `InstitutionStore`. Added batch/subject `<select>`
pickers (populated from `/api/batches`/`/api/subjects`) since these three resources
all require real foreign keys, not free text. Materials additionally has a material
type selector that swaps the URL field's label/target key (`fileUrl` vs
`externalLink`) to match the backend's validation.

Manually tested in the browser: created one real batch, subject, material, homework
item, and assessment through the actual dashboard forms — all persisted and listed
correctly.

`InstitutionStore` itself is now unused by any wired page, though the file remains
in the repo (not deleted) since it's still referenced by pages not yet wired
(Attendance dashboard page, Timetable page, Settings, etc. — see ROADMAP for what's
left).

## Session 10 — 2026-07-24

**Focus:** Frontend auth foundation (login page + route guard)

### What was done
- Added `src/lib/api-client.ts` — client-side `fetch` wrapper attaching the bearer
  token, normalizing errors into a thrown `ApiClientError`
- Added `src/components/auth/AuthProvider.tsx` — React context for `user`/`login`/
  `logout`, persists to localStorage, hydrates on mount
- Wrapped `src/app/layout.tsx` in `AuthProvider`
- Added `src/app/login/page.tsx` — real login form hitting `POST /api/auth/login`
- Turned `src/app/(dashboard)/layout.tsx` into a real guard — redirects to `/login`
  if unauthenticated, previously rendered unconditionally
- Wired the previously-inert "Sign out" button in `src/components/dashboard/TopBar.tsx`
  to real `logout()`, added logged-in user display

### Key decisions
- Token stored in `localStorage`, attached manually via the `Authorization` header
  on every `apiFetch` call — confirmed first that `requireAuth` only reads that
  header, not a cookie
- `AuthProvider`'s localStorage hydration on mount is optimistic (restores UI state
  instantly) but not verified against the server — an expired token surfaces as a
  normal failed-request error on the first real API call
- Matched existing design tokens (`bg-paper`/`bg-saffron`/`font-display` etc. from
  `tailwind.config.js`) for the login page instead of introducing new styling

### Verification
- Manually tested in the browser: login with valid admin credentials redirected to
  `/dashboard`; visiting `/dashboard` directly while logged out redirected to
  `/login`; Sign Out cleared the session and redirected correctly

---

## Session 11 — 2026-07-24

**Focus:** Parent-Student Linking API + Dashboard Wiring (DirectoryPage, and
Batches/Subjects in AdminResourcePage)

> Note: this entry is a reconstruction — the original session log for this work
> was not preserved (a gap discovered and corrected in Session 12). Written from
> the actual code and its comments rather than memory, so treat specifics about
> what was manually tested as approximate, not verified against original notes.

### What was done
- Added `src/app/api/parent-links/route.ts` (`GET`/`POST`) and
  `src/app/api/parent-links/[id]/route.ts` (`GET`/`DELETE`) — CRUD for
  `ParentStudentLink`. Admin sees/manages all links; a parent or student can only
  see their own (query filters ignored for them, same pattern as Assignments).
  Unique constraint on `[parentId, studentId]` → 409 on a duplicate link, no `PATCH`
  since the pair *is* the row's identity. Hard delete — structural, not a person.
- Wired `src/components/dashboard/DirectoryPage.tsx` (Teachers/Students lists) to
  real `/api/teachers`/`/api/students` calls, replacing `InstitutionStore`.
- Wired `src/components/dashboard/AdminResourcePage.tsx` for Batches and Subjects
  to real `/api/batches`/`/api/subjects` calls (Materials/Homework/Assessments for
  this same component followed later, in Session 12's earlier work — see that
  entry's note).

### Verification
- Confirmed working in the browser per user report at the time.

### What's pending (per this reconstruction)
- Materials/Homework/Assessments wiring in AdminResourcePage — completed later,
  see Session 12
- Timetable/Attendance dashboard pages — still on mock data at this point

---

## Session 12 — 2026-07-24

**Focus:** AdminResourcePage completion (Materials/Homework/Assessments), Attendance
UI, and a documentation-debt correction pass

### What was done
- Finished the remaining scope of `AdminResourcePage`: wired Materials, Homework,
  and Assessments (`/api/exams`) to their real APIs, closing out "Dashboard Wiring
  (Admin)" completely — all 5 resource kinds now read/write real data. Added
  batch/subject `<select>` pickers (from `/api/batches`/`/api/subjects`) since these
  three resources need real foreign keys, not free text. Materials additionally has
  a material-type selector that swaps the URL field between `fileUrl` and
  `externalLink` to match backend validation.
- Rewrote `src/app/(dashboard)/dashboard/attendance/page.tsx` — real teacher-facing
  UI: class picker from `GET /api/assignments`, roster from
  `GET /api/students?batchId=`, existing-session detection via
  `GET /api/attendance?...&date=` that pre-fills and switches to `PATCH` instead of
  re-`POST`ing into a 409, recent-sessions list.
- **Documentation correction pass**: `ROADMAP.md` was badly stale — Teachers,
  Students, Parent-Linking, Dashboard Wiring, Timetable API, Attendance API,
  Materials API, Homework API, and Marks/Grades were all built and tested across
  Sessions 1–11 but still showed as `[ ]` unchecked. Corrected all of them, split
  Phase 4's combined "API + UI" lines into separate checkboxes (API done, UI not),
  and fixed an incorrect claim that auth uses HTTP-only cookies (it's Bearer-via-
  header, confirmed while building Session 10's login page).
- Created `docs/api-reference.md` — required by `agent.md`'s workflow but never
  created in any prior session. Backfilled all 8 existing API resources.
- **Discovered Sessions 10–12's work had never been logged in `LOG.md`** — the
  code was written, tested, and pushed, but the corresponding log entries were
  never actually appended to this file. This entry (and the reconstructed Session
  11 entry above it) closes that gap.

### Bug found & fixed
- `src/app/api/parent-links/[id]/route.ts` was misnamed `rote.ts` (typo) since
  Session 11 — Next.js silently never registered it as a route handler. Confirmed
  via `npm run build`'s route list showing `/api/parent-links` but not
  `/api/parent-links/[id]`. `GET`/`DELETE` on a single parent-link have never
  actually worked; list/create (`/api/parent-links`) were unaffected. Fixed by
  renaming the file — no code changes needed, the handler logic itself was correct.

### Key decisions
- Treated stale/missing documentation as a real bug worth fixing immediately,
  not deferred — a tracker that says "TODO" for done work, or a log with silent
  gaps, actively misleads whoever (human or agent) reads it next to decide what
  to do.
- When reconstructing a missing log entry (Session 11), said so explicitly rather
  than presenting a guess as a verified record.

### Verification
- `npm run lint`: zero warnings/errors
- `npm run build`: succeeds, all routes compile
- Manually tested Attendance UI in the browser: mark → submit → appears in recent
  sessions → revisiting same class+date shows pre-fill + "Update attendance" flow
  instead of a duplicate-session 409
- ### Verification
...
- Parent-links `[id]` route fix re-tested via Postman post-rename: `GET` (200,
  full link detail) and `DELETE` (204, then 404 on re-fetch) both confirmed working

### What's pending
  Timetable UI, Study Materials UI (dedicated), Homework UI (teacher/student
  views), Marks UI — all still open per the corrected `ROADMAP.md`
- Materials/Homework retrofit onto `src/lib/content-scope.ts` (flagged Session 9,
  still open)

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
