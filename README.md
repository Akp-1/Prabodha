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

## V1 Scope

In scope:

- Institution registration and role-based authentication
- Faculty, learner, batch or section, and subject management
- Weekly timetable
- Manual attendance
- Study material sharing
- Homework
- Role-specific dashboards
- Basic reports

Out of scope for V1:

- Live video classes
- AI tutoring
- Online examinations
- Chat or messaging
- Library management
- Payroll
- Hostel management
- Transport
- QR attendance
- Fee billing automation
- Advanced ERP modules

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | bcrypt + JWT |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| Validation | Zod |

## Project Structure

```txt
prabodha/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── workflows/
│       └── ci.yml
├── docs/
│   ├── design-prototypes/      # archived HTML mockups and screenshots
│   └── legacy-reference/       # archived Express routes and raw SQL (business logic reference)
│       ├── express/
│       └── sql/
├── prisma/
│   ├── schema.prisma           # single source of truth for the database
│   └── seed.ts                 # demo institution seed data
├── src/
│   ├── app/
│   │   ├── (dashboard)/        # role-specific dashboard pages
│   │   ├── api/                # Next.js Route Handlers (all API endpoints)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── dashboard/          # Sidebar, TopBar, StatCard, etc.
│   └── lib/
│       ├── auth.ts             # JWT sign/verify, password hashing
│       ├── db.ts               # singleton Prisma client
│       ├── rbac.ts             # requireAuth, requireRole, apiHandler
│       └── slugify.ts
├── .env.example
├── agent.md                    # AI agent guidelines for this repo
├── CONTRIBUTING.md
├── LICENSE.md
├── package.json
└── README.md
```

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set `DATABASE_URL` and `JWT_SECRET`.

3. Generate Prisma client:

```bash
npm run db:generate
```

4. Run migrations:

```bash
npm run db:migrate
```

5. Start the app:

```bash
npm run dev
```

## Current Status

Completed:

- Clean Next.js app structure
- Prisma schema
- Authentication API route scaffold
- Dashboard shell
- Institution-first product wording

Next build targets:

- Faculty management API and screens
- Learner management API and screens
- Batch or section management
- Subject management
- Attendance workflow
