# Prabodha — Contributor Workflow Guide

This document describes the daily workflow every contributor (and their AI agent) must follow when working on the Prabodha project.

---

## Getting Started

### 1. Clone and Setup

```bash
git clone https://github.com/Akp-1/Prabodha.git
cd Prabodha
npm install
cp .env.example .env          # Creates local environment file
npx prisma generate           # Generates Prisma client types
npx prisma db push            # Creates local SQLite database
npm run dev                   # Start the dev server at http://localhost:3000
```

### 2. Read These Files First

Before writing any code, read these files to understand the project:

| File | Purpose |
|---|---|
| `ROADMAP.md` | Master task list — find your assigned phase/task here |
| `LOG.md` | Development history — understand what's been done and why |
| `prisma/schema.prisma` | Database schema — the single source of truth |
| `docs/architecture.md` | Tech stack, project structure, patterns |
| `docs/api-reference.md` | Complete API endpoint reference |

### 3. AI Agent Onboarding

If you're using an AI coding agent (Cursor, Windsurf, Copilot, etc.), paste this prompt after cloning:

```text
You are an expert AI coding assistant. I have just cloned the `Prabodha` repository. You will be helping me implement a new feature or fix a bug, but I am the ultimate decision-maker for all code changes.

Please execute the following onboarding steps precisely:

1. **Environment Setup:**
   - Run `npm install` to install all dependencies.
   - If there is no `.env` file, copy `.env.example` to `.env`.
   - Run `npx prisma generate` and `npx prisma db push` (or `migrate dev`) to prepare the local SQLite database.

2. **Context Gathering:**
   - Read the `ROADMAP.md` file in the root directory to understand the product vision, tech stack, and overall project status.
   - Analyze `prisma/schema.prisma` to understand the database architecture and how tables relate via `instituteId`.
   - Briefly review the App Router structure in `src/app/` and the shared utilities in `src/lib/`.

3. **Workflow Compliance (Mandatory):**
   - You MUST create an `implementation_plan.md` outlining what files you will touch and your technical approach. STOP and ask for my approval before modifying any source code.
   - You MUST create a `task.md` checklist of the sub-tasks for today's assignment, updating it as we progress.
   - You MUST create a `walkthrough.md` summarizing what we intend to do, and update it at the end of the session with what was actually accomplished.
   - You MUST maintain a `LOG.md` detailing any structural decisions or bug fixes.

Here is the specific task assigned to me today:
[PASTE ASSIGNED TASK HERE]
```

---

## Daily Workflow

### Before You Start Coding

1. **Create `implementation_plan.md`** — List every file you plan to modify or create. Explain your technical approach. Include open questions. **Stop and get maintainer approval before proceeding.**

2. **Create `task.md`** — Break your assigned work into a checklist:
   ```markdown
   - [ ] Research the existing code for X
   - [ ] Create `src/app/api/newfeature/route.ts`
   - [ ] Wire the dashboard page to the new API
   - [ ] Run `npm run build` — verify no errors
   ```

3. **Create `walkthrough.md`** — Write a brief summary of what you intend to accomplish today.

### While You Code

- Update `task.md` as you progress: `[/]` for in-progress, `[x]` for done.
- Follow the existing patterns in the codebase (see `docs/architecture.md`).
- Every API route must use `apiHandler`, `requireAuth`, and `requireRole`.
- Every database query must be scoped by `instituteId`.
- Use Zod for request body validation.

### End of Day

1. **Update `walkthrough.md`** — Replace your "intent" with what was actually accomplished.
2. **Update `LOG.md`** — Add a session entry with what was done, key decisions made, and verification results.
3. **Verify**: Run `npm run build` to confirm zero TypeScript errors.
4. **Commit and push** your branch. Open a PR for maintainer review.

---

## Code Standards

### API Routes
- File: `src/app/api/{resource}/route.ts` for list/create
- File: `src/app/api/{resource}/[id]/route.ts` for detail/update/delete
- Always export `const dynamic = 'force-dynamic'`
- Always scope queries by `instituteId`
- Soft delete for people (`isActive: false`), hard delete for structural entities

### Dashboard Pages
- File: `src/app/(dashboard)/dashboard/{page}/page.tsx`
- Use `apiFetch()` from `src/lib/api-client.ts` for all API calls
- Show a loading state while fetching
- Handle errors gracefully (try/catch, alert for now)

### Naming Conventions
- Files: `kebab-case` for directories, `PascalCase` for components
- Variables: `camelCase`
- Database columns: `snake_case` (mapped via Prisma `@map()`)
- API responses: `camelCase` (Prisma's default)
