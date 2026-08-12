# Prabodha — Technical & System Design Interview Preparation Guide

This guide is designed to prepare you for technical, architectural, and system design interviews about **Prabodha**. It covers every major design decision, technical trade-off, alternative choice considered, and links directly back to the project's development history in [LOG.md](file:///c:/Users/ayush/Desktop/Prabodha/LOG.md).

---

## Table of Contents
1. [Multi-Tenant Data Isolation & Security](#1-multi-tenant-data-isolation--security)
2. [Database Strategy: SQLite Dev vs. PostgreSQL Production](#2-database-strategy-sqlite-dev-vs-postgresql-production)
3. [Deletion Policy: Soft Delete vs. Hard Delete](#3-deletion-policy-soft-delete-vs-hard-delete)
4. [Time Representation & Date-Pinning Strategy](#4-time-representation--date-pinning-strategy)
5. [Core Architectural Entity: `BatchSubjectTeacher`](#5-core-architectural-entity-batchsubjectteacher)
6. [Timetable Overlap & Conflict Detection Logic](#6-timetable-overlap--conflict-detection-logic)
7. [Authentication, RBAC & API Wrapper (`apiHandler`)](#7-authentication-rbac--api-wrapper-apihandler)
8. [Dedicated Aggregated API: Parent Dashboard](#8-dedicated-aggregated-api-parent-dashboard)
9. [UI Polish: Toast Notifications & Shimmer Skeleton Loaders](#9-ui-polish-toast-notifications--shimmer-skeleton-loaders)
10. [Top System Design & Behavioral Interview Questions](#10-top-system-design--behavioral-interview-questions)

---

## 1. Multi-Tenant Data Isolation & Security

### Question
*"How does Prabodha ensure that data from one educational institute never leaks to another institute in a shared multi-tenant database?"*

### Detailed Answer
Multi-tenant isolation is the primary security invariant of Prabodha. Every single database query in every API route is scoped by `instituteId`. When a user authenticates, their JWT token payload embeds their `instituteId`. All downstream queries (creates, reads, updates, deletes) automatically enforce `where: { instituteId: user.instituteId }`.

### Choices & Alternatives Considered
- **Option A (Chosen): Row-Level Multi-Tenancy (`instituteId` column).** All tenant data lives in shared tables, strictly partitioned by `instituteId` in every query.
- **Option B (Alternative): Schema-per-Tenant.** Create a separate PostgreSQL schema for each institute (`tenant_a.users`, `tenant_b.users`).
- **Option C (Alternative): Database-per-Tenant.** Spin up a separate PostgreSQL database per institute.

### Technical Reasons & Trade-offs
- **Why Option A?** Row-level tenancy is the most cost-effective and scalable approach for SaaS applications targeting hundreds of small-to-medium institutions. Database connections remain pooled, migrations run once across all tenants, and infrastructure costs stay minimal.
- **Trade-off:** Developer discipline is paramount — missing `instituteId` in a single query could leak data. We mitigated this by wrapping all routes in a standardized `apiHandler()` helper.

### Reference in `LOG.md`
- **Session 1 & 2:** Core multi-tenant architecture definition and baseline API handlers.
- **Rule File:** [agent.md](file:///c:/Users/ayush/Desktop/Prabodha/agent.md) (Multi-Tenant Invariant section).

---

## 2. Database Strategy: SQLite Dev vs. PostgreSQL Production

### Question
*"Why did you start with SQLite for local development and transition to PostgreSQL for production? How did you manage the schema compatibility?"*

### Detailed Answer
For rapid initial prototyping, SQLite provided a zero-configuration, file-based database that required no external database server. However, production workloads demand concurrent writes, rich data types, and native enums — capabilities where PostgreSQL excels. Using Prisma ORM allowed us to maintain a unified data access layer while migrating datasource providers seamlessly.

### Choices & Alternatives Considered
- **Option A (Chosen): SQLite for local dev -> PostgreSQL for production via Prisma.**
- **Option B (Alternative): PostgreSQL from Day 1 via Docker.**
- **Option C (Alternative): MySQL / MariaDB.**

### Technical Reasons & Trade-offs
- **Why Option A?** SQLite allowed frictionless setup for any new developer without requiring a background database process.
- **Prisma Schema Bridge:** To ensure compatibility, we designed models with PostgreSQL native enums (`Role`, `MaterialType`, `AttendanceStatus`, `HomeworkCompletionStatus`) and strict type annotations (`@db.Date`, `@db.Time(0)`, `@db.Text`). SQLite-incompatible features like native `String[]` arrays were avoided in favor of explicit junction tables.

### Reference in `LOG.md`
- **Session 1 (2026-07-20):** Local SQLite setup.
- **Session 13 (2026-08-12):** Migration to PostgreSQL with native enums, `@db` attributes, and Docker containerization.

---

## 3. Deletion Policy: Soft Delete vs. Hard Delete

### Question
*"How do you handle record deletion in Prabodha? Why do some entities use soft deletes while others use hard deletes?"*

### Detailed Answer
Prabodha enforces a strict distinction based on entity semantics:
1. **People (Teachers, Students):** **Soft Delete (`isActive: false`)**. We never delete user rows from the database.
2. **Structural / Operational Entities (Batches, Subjects, Timetable Slots, Assignments):** **Hard Delete (`prisma.model.delete()`)**.

### Choices & Alternatives Considered
- **Option A (Chosen): Hybrid Soft/Hard Delete Policy based on entity type.**
- **Option B (Alternative): Universal Soft Delete for everything.**
- **Option C (Alternative): Universal Hard Delete for everything.**

### Technical Reasons & Trade-offs
- **Why Soft Delete for People?** Deleting a student or teacher would break foreign key integrity across historical attendance records, past exam marks, and assigned homework logs. Marking `isActive: false` hides them from active listings while preserving historical audit trails for reporting and compliance.
- **Why Hard Delete for Structure?** Batches, timetable slots, and homework assignments are structural containers. If an admin misconfigures a slot, hard deleting it cleanly removes the bad schedule without cluttering the database.

### Reference in `LOG.md`
- **Session 2 (2026-07-21):** Establishment of the delete policy rule.
- **Session 5 (2026-07-23):** Hard delete decision applied to `BatchSubjectTeacher`.

---

## 4. Time Representation & Date-Pinning Strategy

### Question
*"How do you handle time-only fields like class start time (`09:00 AM`) across different database engines and timezones?"*

### Detailed Answer
In timetable scheduling, time slots like `09:00 AM - 10:00 AM` represent recurring daily times without a specific calendar date. Because Prisma maps PostgreSQL `@db.Time(0)` columns to JavaScript `Date` objects, we adopted a **date-pinning convention**: all time-only fields are normalized and pinned to `1970-01-01T{HH:MM}:00.000Z`.

### Choices & Alternatives Considered
- **Option A (Chosen): Date-pinning to `1970-01-01` (`DateTime` @db.Time(0)).**
- **Option B (Alternative): Raw strings (`"09:00"`).** Works in SQLite but loses database-level time comparisons and indexing in PostgreSQL.
- **Option C (Alternative): Minutes from midnight (`540` for 09:00).** Requires custom application math for every time query.

### Technical Reasons & Trade-offs
- **Why Option A?** JS `Date` requires a date portion. Pinning to `1970-01-01` guarantees consistent string formatting, allows SQL `<` and `>` time comparison queries, and ensures 100% compatibility between Prisma and PostgreSQL `@db.Time(0)`.

### Reference in `LOG.md`
- **Session 6 (2026-07-24):** Decision to store times as `1970-01-01` pinned Date objects.
- **Session 13 (2026-08-12):** Re-verified compatibility with PostgreSQL `@db.Time(0)` columns.

---

## 5. Core Architectural Entity: `BatchSubjectTeacher`

### Question
*"Explain the purpose of the `BatchSubjectTeacher` table. Why is it central to your database design?"*

### Detailed Answer
`BatchSubjectTeacher` is a 3-way junction table that represents the core academic rule: *"This specific Teacher teaches this Subject to this Batch."*

Instead of separate tables for "Teacher-Subject" and "Batch-Teacher", this single entity acts as the primary foreign key for:
- **Timetable Slots (`TimetableSlot`)**
- **Attendance Sessions (`AttendanceSession`)**
- **Teacher Scope Verification**

```
┌───────┐       ┌──────────────────────┐       ┌─────────┐
│ Batch │ ────> │ BatchSubjectTeacher  │ <──── │ Subject │
└───────┘       └──────────────────────┘       └─────────┘
                           │
                           │ <──── Teacher (User)
                           ▼
            ┌─────────────────────────────┐
            │  Timetable / Attendance     │
            └─────────────────────────────┘
```

### Choices & Alternatives Considered
- **Option A (Chosen): Consolidated 3-way junction table `BatchSubjectTeacher`.**
- **Option B (Alternative): Separate 2-way tables (`BatchSubject` + `TeacherSubject`).**

### Technical Reasons & Trade-offs
- **Why Option A?** Option B would allow ambiguous states (e.g., a batch has Math, and a teacher teaches Math, but who teaches Math to Class 10A?). Option A cleanly models reality, reduces join complexity, and enables simple unique constraints `@@unique([batchId, subjectId])`.

### Reference in `LOG.md`
- **Session 5 (2026-07-23):** Implementation of `BatchSubjectTeacher` CRUD API.

---

## 6. Timetable Overlap & Conflict Detection Logic

### Question
*"How does Prabodha prevent scheduling conflicts when an administrator creates a new timetable slot?"*

### Detailed Answer
When a new slot is submitted, the API performs application-level overlap detection before saving to the database. It checks three distinct collision conditions for the specified `dayOfWeek`:
1. **Teacher Conflict:** Is this teacher already teaching another class during this time interval?
2. **Batch Conflict:** Is this batch already scheduled for another subject during this time interval?
3. **Classroom Conflict:** Is the target classroom already occupied by another class during this time interval?

### Overlap Mathematical Condition
Two time intervals `[StartA, EndA)` and `[StartB, EndB)` overlap if and only if:
$$\text{StartA} < \text{EndB} \quad \text{AND} \quad \text{EndA} > \text{StartB}$$

If any existing slot satisfies this condition, the API immediately throws an `HTTP 409 Conflict` error detailing the specific collision.

### Reference in `LOG.md`
- **Session 6 (2026-07-24):** Implementation and test pass for timetable conflict detection logic.

---

## 7. Authentication, RBAC & API Wrapper (`apiHandler`)

### Question
*"How does your backend handle authentication, authorization, and standardized error responses?"*

### Detailed Answer
All API endpoints pass through a centralized higher-order handler function `apiHandler()` in `src/lib/rbac.ts`.

```typescript
export function apiHandler(handler: (req: NextRequest, user: TokenPayload) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      const user = await requireAuth(req);
      return await handler(req, user);
    } catch (err) {
      return handleApiError(err);
    }
  };
}
```

### Security & Implementation Highlights
- **JWT Payload:** Contains `sub` (user ID), `instituteId`, and `role`.
- **Role Verification:** `requireRole(user, 'admin')` checks user permissions.
- **Data Privacy:** All Prisma queries use explicit `select` blocks to omit `passwordHash`.
- **Standardized Errors:** Zod schema validation errors return `400 Bad Request`, auth failures return `401/403`, Prisma P2002 duplicate constraints map to `409 Conflict`, and internal exceptions map to `500`.

### Bug Story (Great Interview Narrative!)
> *"During Session 5 testing, teacher-scoped queries were returning un-filtered data. Upon log inspection, we discovered `requireAuth()` returned JWT payload with `.sub` for user ID, but several route handlers accessed `user.id` (which was `undefined`). In Prisma `where` filters, `undefined` is treated as 'no filter', silently removing tenant restrictions! We fixed all call sites to use `user.sub` and added automated TypeScript checks."*

### Reference in `LOG.md`
- **Session 1 (2026-07-20):** `apiHandler` wrapper architecture.
- **Session 5 (2026-07-23):** Bug discovery & fix regarding `user.sub` vs `user.id`.

---

## 8. Dedicated Aggregated API: Parent Dashboard

### Question
*"Why did you build a dedicated `/api/parent-dashboard` endpoint instead of allowing parents to call the individual student endpoints directly?"*

### Detailed Answer
Instead of modifying existing student-facing APIs (`/api/attendance`, `/api/homework`, `/api/exams`) to accommodate parent role permissions and risk breaking RBAC boundaries, we created a single, purpose-built aggregation endpoint `/api/parent-dashboard`.

### Benefits
1. **Security Isolation:** Keeps existing student/teacher RBAC boundaries strictly untouched.
2. **Network Performance:** Reduces parent UI client requests from 4 separate HTTP round-trips down to 1 single payload fetch.
3. **Server-Side Aggregation:** Computes attendance rates, homework completion percentages, and exam averages directly in Node.js/Prisma.

### Reference in `LOG.md`
- **Session 12 (2026-08-02):** Design and implementation of Parent Dashboard API and UI components.

---

## 9. UI Polish: Toast Notifications & Shimmer Skeleton Loaders

### Question
*"How did you improve the user experience during async API calls and server errors?"*

### Detailed Answer
- **Toast Notification System:** Built `ToastProvider` and `useToast()` hook ([src/components/ui/Toaster.tsx](file:///c:/Users/ayush/Desktop/Prabodha/src/components/ui/Toaster.tsx)) to replace disruptive native browser `alert()` popups with non-blocking, auto-expiring toasts.
- **Shimmer Skeletons:** Created `Skeleton.tsx` containing layout-matched skeleton components (`SkeletonTable`, `SkeletonCard`, `SkeletonList`, `SkeletonDashboard`) that prevent Cumulative Layout Shift (CLS) while data loads.

### Reference in `LOG.md`
- **Session 13 (2026-08-12):** UI polish, Toaster system, and Skeleton integration.

---

## 10. Top System Design & Behavioral Interview Questions

### Q1: *"If Prabodha scales to 10,000 institutes and 1,000,000 students, where will the bottlenecks be, and how would you scale it?"*
- **Database Bottleneck:** Shared PostgreSQL CPU/RAM under peak morning attendance submit times.
  - **Solution:** Add PostgreSQL Read Replicas for `GET` queries (dashboard, timetable, materials). Use Redis for caching session tokens and static timetable slots.
- **File Storage Bottleneck:** Study materials and homework PDFs stored on application disk.
  - **Solution:** Migrate file uploads to S3-compatible cloud storage (AWS S3, Cloudflare R2) with CDN delivery.
- **Database Partitioning:** Partition large tables like `attendance_records` and `marks` by `instituteId` or range-partition by `session_date`.

### Q2: *"What was the hardest bug you encountered, and how did you diagnose it?"*
- **Answer:** The `user.sub` vs `user.id` bug in Session 5 where `undefined` in Prisma `where` clause bypassed teacher scoping. I diagnosed it by inspecting API output payloads, tracing variable definitions in `rbac.ts`, and comparing actual Prisma query execution logs against expected outputs.

---

### Quick Cheat Sheet Summary for Interviewers

| Feature / System | Technology / Choice | Why? |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 App Router | SSR, fast routing, client/server boundaries |
| **Database** | PostgreSQL + Prisma ORM | Native enums, `@db` types, ACID, multi-tenant queries |
| **Security** | JWT + Custom RBAC Wrapper | Stateless, row-level `instituteId` filter, password omission |
| **Scheduling** | Interval Overlap Formula | Application-level collision check before insert |
| **Time Format** | Date-pinned (`1970-01-01`) | Cross-database compatibility (Prisma + PostgreSQL `@db.Time`) |
| **Deletion** | Soft (People), Hard (Structure) | Preserve academic records while cleaning bad configs |
