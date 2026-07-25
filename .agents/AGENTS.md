# Prabodha — Agent Rules

## 1. Mandatory Onboarding
Before writing ANY code or making ANY changes, you MUST read these files first:
- `agent.md` — Master project guidelines, V1 scope boundaries, and core architecture
- `ROADMAP.md` — Current project status, master task list, what's done vs pending
- `LOG.md` — Full development history, key decisions, bugs found
- `docs/architecture.md` — Tech stack, project structure, API patterns
- `docs/api-reference.md` — All API endpoints with request/response shapes
- `docs/contributor-guide.md` — Setup instructions, daily workflow, code standards

## 2. Mandatory Workflow Documents
Every work session MUST produce/update these documents:
- **implementation_plan.md** — What files will be touched, technical approach, open questions. STOP and get user approval before modifying source code.
- **task.md** — Checklist of sub-tasks. Update as you progress (`[ ]` → `[/]` → `[x]`).
- **walkthrough.md** — Summary of what was accomplished this session.
- **LOG.md** (in repo root) — Add a new session entry with: what was done, key decisions, verification results, what's pending.

## 3. API Route Conventions
- Every route handler uses `apiHandler()` wrapper from `src/lib/rbac.ts`
- Every route calls `requireAuth(request)` first to get the authenticated user
- Every database query MUST be scoped by `instituteId` (multi-tenant isolation - CRITICAL INVARIANT)
- Use `requireRole(user, 'admin')` for admin-only operations
- Use Zod schemas for all POST/PATCH request body validation
- Export `const dynamic = 'force-dynamic'` in every API route file
- Responses use explicit `select` to exclude `passwordHash`

## 4. Delete Policy
- **Soft delete** for people (teachers, students): Set `isActive: false`, never remove the row
- **Hard delete** for structural entities (batches, subjects, assignments, timetable slots)

## 5. Database Constraints
- **Local Dev:** SQLite (configured in `prisma/schema.prisma`)
- **Production:** PostgreSQL (target deployment on VPS)
- **SQLite Dev Rules:**
  - No native `enum` — use `String` in Prisma schema, validate via Zod/TypeScript unions
  - No `String[]` — use comma-separated strings or junction tables
  - No time-only type — store times as `DateTime` pinned to `1970-01-01`
  - Use `cuid()` for all IDs (not `uuid()`)
  - Keep all Prisma models compatible with future PostgreSQL migration

## 6. Scope Boundaries (V1)
- **In Scope:** Institution registration, RBAC auth, faculty/learner/batch/subject CRUD, weekly timetable, manual attendance, study material sharing, homework, role-specific dashboards, basic reports.
- **Out of Scope (do not build unless requested):** Live video classes, AI tutoring, online exams, chat/messaging, library management, payroll, hostel/transport, QR attendance, fee billing automation, advanced ERP.

## 7. Frontend Conventions
- Use `apiFetch()` from `src/lib/api-client.ts` for all API calls (auto-attaches Bearer token)
- Show a loading state while fetching from APIs
- Pages without a backend API still use `InstitutionStore` (localStorage mock) — don't remove it from the layout
- JWT token key in localStorage: `prabodha-auth-token`

## 8. Git & Build Discipline
- Always run `npm run build` before considering work complete — zero TypeScript errors required
- Write descriptive commit messages with conventional prefixes (`feat:`, `fix:`, `docs:`)
- Push to `main` after every completed session
- Update `ROADMAP.md` when tasks are completed
