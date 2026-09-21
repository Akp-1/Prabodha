# Task: Switch Database to PostgreSQL for Supabase & Vercel Deployment

- [x] 1. Plan & Document
  - [x] 1.1 Create `task.md` with detailed execution steps <!-- id: 0 -->
  - [x] 1.2 Create `implementation_plan.md` detailing PostgreSQL migration and Vercel compatibility <!-- id: 1 -->
  - [x] 1.3 Obtain user approval before modifying code files <!-- id: 2 -->
- [x] 2. Core Schema & Config Migration
  - [x] 2.1 Update `prisma/schema.prisma` to `provider = "postgresql"`, restore native enums (`Role`, `MaterialType`, `AttendanceStatus`, `HomeworkCompletionStatus`), `@db.Date`, `@db.Time(0)`, and `@db.Text` <!-- id: 3 -->
  - [x] 2.2 Update `.env.example` with Supabase PostgreSQL connection configurations (direct & pooler) <!-- id: 4 -->
  - [x] 2.3 Update `package.json` to include `"db:push": "prisma db push"` for straightforward Supabase schema syncing <!-- id: 5 -->
  - [x] 2.4 Regenerate Prisma Client using `npx prisma generate` <!-- id: 6 -->
- [x] 3. Type Checking, Build & Verification
  - [x] 3.1 Run `npx tsc --noEmit` to ensure zero type regressions with PostgreSQL schema and enums <!-- id: 7 -->
  - [x] 3.2 Run `npm run build` to ensure Vercel-ready build passes cleanly <!-- id: 8 -->
- [x] 4. Documentation & Git Commit
  - [x] 4.1 Update `LOG.md` (Session 19: PostgreSQL Switch for Supabase & Vercel) <!-- id: 9 -->
  - [x] 4.2 Update `ROADMAP.md` if necessary <!-- id: 10 -->
  - [x] 4.3 Create `walkthrough.md` with deployment instructions for Supabase & Vercel <!-- id: 11 -->
  - [x] 4.4 Commit and push changes to GitHub `main` branch as requested <!-- id: 12 -->
