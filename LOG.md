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

### What's pending
- Entity CRUD API routes (teachers, students, batches, subjects, timetable, attendance, materials, homework)
- Wire dashboard pages from localStorage mock → real Prisma-backed API calls
- Git initialization + first commit

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
