# Contributing to Prabodha

Thanks for helping build this. A few things to know before you dive in.

## Ground rules

- **Read the module you're touching first.** Every module has a section in
  the README describing what it does and why it's scoped the way it is —
  Prabodha is deliberately simple, and "simple software solves more problems
  than complicated software" is the actual design philosophy, not a slogan.
  If a change adds complexity, it needs a reason beyond "it'd be nice."
- **V1 scope is fixed.** Check the README's "Out of Scope for V1" list
  before proposing a feature. Things like online exams, live classes, and a
  chat system are intentionally deferred — open an issue to discuss before
  building any of them.
- **Multi-tenancy is not optional.** Every query that touches institute data
  must be scoped by `instituteId`. This is the single most important
  invariant in the codebase — a bug here means one institute seeing
  another's data. If you're adding a new table, it almost certainly needs an
  `instituteId` column and every query needs a `where: { instituteId }`.

## Getting set up

See the [README](./README.md#local-development) for the full local setup —
Node version, database, environment variables, seeding.

## Workflow

1. Check open issues / the roadmap in the README before starting something
   large, so two people don't build the same module.
2. Branch off `main`: `git checkout -b feat/short-description` or
   `fix/short-description`.
3. Keep PRs scoped to one module or one fix where possible — easier to
   review, easier to revert if something's wrong.
4. Run `npm run lint` and `npm run build` locally before opening the PR
   (CI runs both, but catching it locally is faster).
5. Open the PR against `main`. Describe **what** changed and **why** — for
   anything touching permissions/RBAC, explicitly state which roles can now
   do what.

## Code conventions

- **API routes**: every protected route handler starts with
  `requireAuth(request)`, then `requireRole(user, ...)` if it's role-gated.
  See `src/app/api/auth/create-user/route.ts` for the reference pattern.
- **Validation**: use `zod` schemas at the top of each route file — don't
  hand-roll `if (!field) return ...` checks.
- **Database**: all queries go through `src/lib/db.ts`'s Prisma client.
  Never write raw SQL unless Prisma genuinely can't express the query —
  and if you do, use `prisma.$queryRaw` with parameterized values, never
  string concatenation.
- **Errors**: throw `ApiError(status, message)` from `src/lib/rbac.ts`
  rather than manually constructing error responses — `apiHandler` catches
  it and formats the response consistently.
- **Naming**: database columns are `snake_case` (via Prisma's `@map`),
  everything in TypeScript is `camelCase`. Don't fight this — it's already
  handled by the schema mappings.

## Commit messages

Keep them plain: `add attendance overlap check`, `fix parent access on
homework route`. No strict convention enforced yet, but be descriptive
enough that `git log --oneline` is useful on its own.

## Questions

Open a [Discussion](../../discussions) or comment on the relevant issue —
better to ask before writing 300 lines than after.
