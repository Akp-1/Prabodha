# Implementation Plan — Dashboard UI Enhancement, Pass 2

## Goal
Second pass on the role-based dashboard homes: richer visuals + more useful content,
building on Pass 1 (DashboardHeader, TodayPanel, StatCard polish — already shipped).

## Changes

1. **`src/lib/relative-time.ts`** (new)
   - `relativeTime(date)` → "2h ago", "Yesterday", "3 days ago", etc. Shared by the
     activity feed and homework list below.

2. **`ActivityFeed.tsx`** (new, shared)
   - Renders a list of `{ id, icon, title, subtitle, at }` items with relative timestamps.
   - Own loading skeleton + empty state.

3. **`AdminHome`**
   - Fetch recent homework, materials, and attendance sessions (already-available endpoints,
     no new API) and merge into one "Recent activity" feed (latest 6, sorted by date).
   - Add a progress bar + "X of Y done" to the "Getting started" checklist.
   - Improve `TodayPanel` empty state with an icon instead of bare text (shared change,
     benefits all roles).

4. **`TeacherHome`**
   - Add "Recent activity" feed scoped to their own recently assigned homework + uploaded
     materials.

5. **`StudentHome`**
   - Add an "Upcoming homework" list — nearest 4 by `dueDate`, using the homework fetch
     already in place. Replaces the bare 3-stat-card-only layout.

6. **`ParentHome`**
   - No structural change this pass (already the richest view). Skip.

## Non-goals
- No new API routes/schema changes — everything is composed from existing endpoints.
- No fabricated numbers (e.g. no fake "+12% this week" trend text) — only real computed data.

## Verification
- `npm run lint`, `npx tsc --noEmit` on touched files, `npm run build` (webpack compile step;
  full type-check may hit the same pre-existing sandbox Prisma-engine limitation noted in
  Session 17 — not caused by these changes).
