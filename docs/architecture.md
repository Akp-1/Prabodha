# Prabodha — Architecture Reference

This document describes the technical architecture of the Prabodha platform for contributors working on the codebase.

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | Pages in `src/app/`, API routes in `src/app/api/` |
| Language | TypeScript | Strict mode |
| Database | SQLite (dev) / PostgreSQL (prod) | Configured in `prisma/schema.prisma` |
| ORM | Prisma | Schema = single source of truth for all tables |
| Auth | bcrypt + JWT (Bearer) | Token issued by `/api/auth/login`, verified in `src/lib/rbac.ts` |
| Styling | Tailwind CSS | Custom palette: Pine (green), Saffron (gold), Paper (warm white) |
| Validation | Zod | Used in all API route handlers for request body validation |

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Dashboard route group
│   │   ├── dashboard/        # All dashboard pages
│   │   │   ├── page.tsx      # Main dashboard (stats + checklist)
│   │   │   ├── teachers/     # Faculty management
│   │   │   ├── students/     # Learner management
│   │   │   ├── batches/      # Batch/section management
│   │   │   ├── subjects/     # Subject management
│   │   │   ├── timetable/    # Weekly schedule
│   │   │   ├── attendance/   # Daily attendance marking
│   │   │   ├── homework/     # Homework assignments
│   │   │   ├── materials/    # Study material library
│   │   │   ├── marks/        # Assessment scores
│   │   │   └── settings/     # Institute settings
│   │   └── layout.tsx        # Dashboard shell (Sidebar + TopBar + InstitutionStore)
│   ├── api/
│   │   ├── auth/             # 7 auth endpoints
│   │   ├── batches/          # CRUD + bulk student assignment
│   │   ├── subjects/         # CRUD
│   │   ├── teachers/         # CRUD (soft delete)
│   │   ├── students/         # CRUD (soft delete, teacher-scoped)
│   │   ├── assignments/      # BatchSubjectTeacher CRUD
│   │   └── timetable/        # CRUD with conflict detection
│   ├── page.tsx              # Landing/placeholder page
│   └── layout.tsx            # Root layout
├── components/
│   └── dashboard/
│       ├── AdminResourcePage.tsx   # Table + modal form for batches/subjects/etc
│       ├── DirectoryPage.tsx       # Table + modal form for teachers/students
│       ├── InstitutionStore.tsx    # localStorage mock (used by pages without APIs)
│       ├── Sidebar.tsx             # Navigation sidebar
│       ├── StatCard.tsx            # Dashboard stat card
│       └── TopBar.tsx              # Top navigation bar
└── lib/
    ├── api-client.ts          # Client-side fetch wrapper with Bearer token
    ├── auth.ts                # Password hashing, JWT sign/verify, TokenPayload type
    ├── db.ts                  # Prisma client singleton
    └── rbac.ts                # requireAuth, requireRole, apiHandler, ApiError
```

## Database Schema (13 Models)

The Prisma schema defines 13 tables. Every table has an `instituteId` foreign key for multi-tenant isolation. Key relationships:

- **Institute** → has many Users, Batches, Subjects
- **User** → polymorphic via `role` field (`admin`, `teacher`, `student`, `parent`)
- **Batch** → groups students; has many `BatchSubjectTeacher` assignments
- **Subject** → taught in batches; has many `BatchSubjectTeacher` assignments
- **BatchSubjectTeacher** → the central junction: "teacher X teaches subject Y to batch Z"
- **TimetableSlot** → references a `BatchSubjectTeacher` + day/time/classroom
- **AttendanceSession** / **AttendanceRecord** → per-class attendance tracking
- **StudyMaterial** / **Homework** / **HomeworkStatus** → content & assignment tracking
- **ParentStudentLink** → links parent accounts to student profiles

## API Patterns

All API route handlers follow the same pattern:

```typescript
export const GET = apiHandler(async (request: NextRequest) => {
  const user = requireAuth(request);     // Verifies JWT, returns TokenPayload
  requireRole(user, 'admin');            // Optional role check
  
  const data = await prisma.model.findMany({
    where: { instituteId: user.instituteId },  // Always scope by institute
  });
  
  return NextResponse.json(data);
});
```

- `apiHandler()` wraps handlers in try/catch, converts `ApiError` throws to JSON responses
- `requireAuth()` reads the `Authorization: Bearer <token>` header
- All queries are scoped by `instituteId` — no cross-tenant data leaks
- Zod schemas validate all POST/PATCH request bodies
- Soft delete (`isActive: false`) for people; hard delete for structural entities

## Auth Flow

1. Admin registers institute → `POST /api/auth/register-institute` → creates Institute + admin User → returns JWT
2. Admin creates users → `POST /api/auth/create-user`
3. User logs in → `POST /api/auth/login` → returns JWT
4. JWT stored in client-side localStorage (key: `prabodha-auth-token`)
5. Every API call includes `Authorization: Bearer <token>` header via `apiFetch()` helper
