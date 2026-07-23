# Prabodha — Agent Guidelines

## Project Overview

Prabodha is a **lightweight, multi-tenant Institution Management Platform** with integrated learning management. It gives coaching institutes, schools, colleges, and training centres a single role-based system to manage learners, faculty, batches, subjects, attendance, study materials, homework, dashboards, and reports.

Four user roles exist: **Admin**, **Teacher**, **Student**, **Parent** — every operation is scoped to a single institute via `instituteId`.

**Current status:** V1 is in active development. The core scaffold (auth, Prisma schema, dashboard shell, API route patterns) is in place. Next build targets are faculty/learner management screens, batch/section management, subject management, and the attendance workflow.

---

## Tech Stack & Constraints

| Layer        | Choice                     |
|------------- |----------------------------|
| Framework    | Next.js 14 (App Router)    |
| Language     | TypeScript                 |
| Database     | PostgreSQL                 |
| ORM          | Prisma                     |
| Auth         | bcrypt + JWT (Bearer)      |
| Styling      | Tailwind CSS               |
| Icons        | lucide-react               |
| Validation   | Zod                        |
| Node         | ≥ 18.18.0                  |

### Key architectural notes

- The backend is **Next.js App Router** (`src/app/api/`) with **Prisma** as the ORM. There is no separate backend server.
- The Prisma schema (`prisma/schema.prisma`) is the **single source of truth** for the database.
- A `docs/legacy-reference/` archive contains the original Express routes and raw SQL schemas from an earlier iteration. These are preserved for **business logic reference only** — do not use them as active code.
- Environment variables are defined in `.env.example`: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`.

### V1 scope boundaries

**In scope:** Institution registration, RBAC auth, faculty/learner/batch/subject CRUD, weekly timetable, manual attendance, study material sharing, homework, role-specific dashboards, basic reports.

**Out of scope (do not build unless explicitly requested):** Live video classes, AI tutoring, online exams, chat/messaging, library management, payroll, hostel/transport, QR attendance, fee billing automation, advanced ERP.

---

## Coding Standards

### File & directory structure

```
src/
├── app/
│   ├── (dashboard)/    # Role-specific dashboard pages (layout group)
│   ├── api/            # Next.js Route Handlers (all API endpoints)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── dashboard/      # Dashboard-specific UI components
└── lib/
    ├── auth.ts         # JWT sign/verify helpers
    ├── db.ts           # Singleton Prisma client instance
    ├── rbac.ts         # requireAuth, requireRole, apiHandler, ApiError
    └── slugify.ts      # Slug generation utility
prisma/
├── schema.prisma       # Single source of truth for DB schema
└── seed.ts             # Dev seed data
```

### Naming conventions

- **Database columns:** `snake_case` (handled by Prisma `@map` directives — never rename the mappings).
- **TypeScript code:** `camelCase` for variables/functions, `PascalCase` for types/classes/components.
- **Files:** `kebab-case` for route directories and utility files; `PascalCase.tsx` for React components.

### API route patterns

1. Wrap every handler with `apiHandler()` from `src/lib/rbac.ts`.
2. Start every protected route with `const user = requireAuth(request)`.
3. Add `requireRole(user, 'admin')` (or appropriate roles) for role-gated endpoints.
4. Validate request bodies with Zod schemas defined at the top of each route file — **no** hand-rolled `if (!field)` checks.
5. Throw `new ApiError(status, message)` for all error cases — `apiHandler` handles formatting.
6. All database queries go through the Prisma client from `src/lib/db.ts`. Never write raw SQL unless Prisma genuinely can't express the query — and if you must, use `prisma.$queryRaw` with parameterized values. **No string concatenation in queries.**

### Multi-tenancy (CRITICAL INVARIANT)

> **Every query that touches institute data MUST be scoped by `instituteId`.**
>
> This is the single most important rule in the codebase. A bug here means one institute seeing another's data. If adding a new table, it almost certainly needs an `instituteId` column, and every `where` clause must include it.

### Error handling

- Use the `ApiError` class for expected errors (401, 403, 404, 409, 422).
- `apiHandler` automatically catches Prisma unique constraint violations (`P2002`) and returns a 409.
- Unexpected errors are logged to console and return a generic 500.

### Styling

- Use Tailwind CSS utility classes. The config is in `tailwind.config.js` and PostCSS in `postcss.config.js`.
- Global styles live in `src/app/globals.css`.
- Use `lucide-react` for icons.

### Git & PR conventions

- Branch naming: `feat/short-description` or `fix/short-description`.
- Commit messages: plain, descriptive (`add attendance overlap check`, `fix parent access on homework route`).
- Keep changes scoped to one module per commit/PR where possible.
- Run `npm run lint` and `npm run build` before considering work complete.

---

## Agent Instructions

1. **Always scope by `instituteId`.** Before writing any Prisma query, verify that the `where` clause includes `instituteId`. Pull it from the authenticated user's JWT payload (`user.instituteId`).

2. **Follow the established API route pattern exactly.** Look at any existing route under `src/app/api/` for reference. The pattern is: `apiHandler` → `requireAuth` → `requireRole` → Zod validation → Prisma query → `NextResponse.json`.

3. **Reference legacy code in `docs/legacy-reference/` for business logic only.** The archived Express routes contain well-implemented patterns (teacher overlap detection, transactional attendance, parent-student linking) that should be referenced when building the Next.js equivalents — but never imported or executed.

4. **Schema changes go through Prisma.** Modify `prisma/schema.prisma` and run `npx prisma migrate dev`. Never create raw SQL migration files.

5. **Validate all user input with Zod.** Define schemas at the top of route files. Parse with `.parse()` or `.safeParse()` and throw `ApiError(422, ...)` on failure.

6. **Keep V1 simple.** Do not add features outside V1 scope. If uncertain about scope, ask. The design philosophy is: *"Simple software solves more problems than complicated software."*

7. **Run verification.** After making changes, run `npm run lint` and `npm run build` to check for errors. If the user has a database available, run `npx prisma migrate dev` after schema changes.

8. **Respect existing comments and docstrings.** Do not remove or modify documentation comments that are unrelated to your changes.
