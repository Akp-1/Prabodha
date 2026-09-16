# Prabodha

**Prabodha is a lightweight, multi-tenant Institution Management Platform with integrated learning management.**

It gives an educational institution one place to manage learners, faculty, batches or sections, subjects, attendance, study material, homework, dashboards, and basic reports.

## What This Solves

Many small and medium institutions still run daily academic operations through paper registers, spreadsheets, messaging groups, and scattered files. That creates repeated work, poor record keeping, and limited visibility for administrators, teachers, learners, and parents.

Prabodha replaces that fragmented workflow with a single role-based system:

- **Admin:** manages the institution, users, batches, subjects, timetable, and reports.
- **Teacher:** handles attendance, study material, homework, and marks.
- **Student:** views timetable, attendance, study material, homework, and marks.
- **Parent:** monitors attendance, homework, and academic progress.

## Target Users

Version 1 is designed for:

- Coaching institutes
- Schools
- Colleges
- Tuition centres
- Training centres
- Skill development institutes

The first real deployment can still be a coaching institute, but the product language and architecture are institution-first.

## Live Deployment

- **Production URL:** [https://prabodha-erp.vercel.app](https://prabodha-erp.vercel.app)
- **Database:** Supabase Cloud PostgreSQL with SSL Connection Pooling
- **Hosting:** Vercel (Automated zero-downtime builds)

## V1 Scope & Feature Matrix

All V1 features are **100% complete and deployed**:

| Module | Features | Primary Roles |
| --- | --- | --- |
| **Authentication & RBAC** | Institute registration, JWT auth, secure logout, password reset, fail-fast production secrets | Admin, Teacher, Student, Parent |
| **Faculty Management** | Faculty directory, profile editing, soft-delete (`isActive`), batch/subject assignments | Admin |
| **Learner Management** | Student directory, section assignment, bulk CSV/JSON onboarding (`Name@XXXX` credentials) | Admin |
| **Academic Hierarchy** | Batch/section creation, subject mapping, teacher-subject-batch junction bindings | Admin |
| **Timetable Grid** | Visual calendar/grid view, slot assignment, conflict-free scheduling | Admin, Teacher, Student |
| **Attendance Tracking** | Quick-input classroom attendance, session logs, student history, animated attendance rings | Teacher, Student, Parent |
| **Study Materials** | Cloud repository for lecture notes, reference URLs, and PDFs scoped by batch & subject | Teacher, Student |
| **Homework System** | Assignment creation, submission tracking, completion status (`completed`/`pending`/`late`) | Teacher, Student, Parent |
| **Marks & Examinations** | Exam creation, score entry, percentage calculations, grade records | Teacher, Student, Parent |
| **Parent Dashboard** | Unified multi-child monitoring: attendance rings, homework progress bars, recent exam tables | Parent |

### Out of Scope for V1 (Deferred to Future Versions)
- Live video classes & WebRTC
- AI tutoring & automated essay grading
- Online proctored examinations
- Chat / instant messaging
- Library, hostel, transport, & payroll management
- Hardware QR / biometric attendance devices

## Architecture & Security Hardening

Prabodha is engineered for speed, low overhead, and strict multi-tenant isolation capable of handling **100,000+ users**:

1. **Strict Multi-Tenant Isolation**: Every database query across all 37 API routes is strictly scoped by `instituteId`.
2. **High-Scale Session Cache (`src/lib/session.ts`)**:
   - In-memory bounded LRU/TTL cache (60s TTL, max 50,000 active entries, <10MB RAM).
   - High-throughput: **899,000+ ops/sec** with **1.11μs latency**, preventing database connection pool exhaustion.
   - **Instant Invalidation**: Soft-deleting or deactivating a user immediately purges their cache entry, blocking further API access within milliseconds (HTTP 403).
3. **Stateless JWT Revocation on Logout (`CRITICAL-3`)**:
   - Each token embeds a unique cryptographically random UUIDv4 `jti` claim.
   - Calling `POST /api/auth/logout` places the token on a server-side revocation list until natural expiry, rejecting any subsequent replay attacks (HTTP 401).
4. **Zero-Dependency Rate Limiting (`src/lib/rate-limit.ts`)**:
   - In-memory sliding-window limiter protecting critical authentication endpoints against brute force:
     - `POST /api/auth/login`: 10 attempts/min per IP (HTTP 429).
     - `POST /api/auth/forgot-password`: 5 attempts/min per IP.
   - Protects bulk-generated student passwords from credential stuffing without requiring external Redis dependencies.
5. **Platform Security Headers**:
   - Global HTTP headers via `next.config.js`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-DNS-Prefetch-Control`, `Referrer-Policy: strict-origin-when-cross-origin`.
6. **Password Reset Hardening (`CRITICAL-1`)**:
   - `devResetToken` is strictly gated behind `NODE_ENV === 'development'` and completely excluded from production builds.

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | Next.js 14 App Router (React 18) |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL (Supabase Cloud in Prod / SQLite or Postgres in Local Dev) |
| **ORM** | Prisma 5 (13 relational models + PostgreSQL native enums) |
| **Authentication** | Custom JWT (UUIDv4 `jti` + server revocation) & bcryptjs |
| **Styling** | Tailwind CSS (Custom Pine, Saffron, and Paper theme) |
| **Icons** | Lucide React |
| **Validation** | Zod |

## Project Structure

```txt
prabodha/
├── .github/workflows/ci.yml    # CI build and lint verification
├── docs/                       # Architecture, API references, and contributor guides
├── prisma/
│   ├── schema.prisma           # Single source of truth for the database
│   └── seed.ts                 # Demo seed data (batches, teachers, 30 students, marks)
├── scripts/
│   └── verify-e2e.ts           # 6-vector security & high-scale verification test suite
├── src/
│   ├── app/
│   │   ├── (dashboard)/        # Role-specific dashboard views (Admin, Teacher, Student, Parent)
│   │   ├── api/                # 37 Next.js Route Handlers (Auth, Batches, Attendance, etc.)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── dashboard/          # Sidebar, TopBar, StatCard, etc.
│   │   └── ui/                 # Toaster, Skeleton loaders, etc.
│   └── lib/
│       ├── api-client.ts       # Frontend fetch client with auto Bearer token injection
│       ├── auth.ts             # JWT sign/verify, password hashing, secret validation
│       ├── content-scope.ts    # Teacher content ownership & assignment resolution
│       ├── db.ts               # Singleton Prisma client
│       ├── rate-limit.ts       # Zero-dependency sliding-window rate limiter
│       ├── rbac.ts             # requireAuth, requireRole, apiHandler wrapper
│       └── session.ts          # High-scale LRU/TTL user status cache & token revocation
├── .env.example
├── agent.md                    # Master architectural rules & multi-tenant invariants
├── LOG.md                      # Comprehensive development history & session log
├── ROADMAP.md                  # Project tracker & completed phases
├── package.json
└── README.md
```

## Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Akp-1/Prabodha.git
   cd Prabodha
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Configure `DATABASE_URL` (SQLite file or PostgreSQL connection string) and `JWT_SECRET`.

4. **Initialize Database:**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **Start Local Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Verification & Testing

Run the end-to-end security and scalability test suite:
```bash
npx tsx scripts/verify-e2e.ts
```

Build the production bundle (validates TypeScript and Next.js static optimizations):
```bash
npm run build
```

## Demo Credentials (Seeded Database)

After running `npm run db:seed`, log in using Institute Slug: `vector-classes`:

| Role | Email | Password |
| --- | --- | --- |
| **Admin** | `admin@prabodha.local` | `password123` |
| **Teacher** | `teacher@prabodha.local` | `password123` |
| **Student** | `student@prabodha.local` | `password123` |
| **Parent** | `parent@prabodha.local` | `password123` |

