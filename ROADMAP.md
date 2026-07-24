# Prabodha Master Roadmap & Project Tracker

This document serves as the central command post for the Prabodha project. It covers the product vision, tech stack, contributor guidelines (specifically for AI-assisted workflows), and a comprehensive master checklist of everything completed and everything remaining until deployment.

---

## 1. Product Vision & Placement
**Prabodha** is a multi-tenant SaaS platform designed to streamline operations for educational institutions (schools, coaching centers, vector classes). 
- **Core Value Proposition:** Simple software solves more problems than complicated software. Prabodha focuses on speed, clarity, and ease of use over feature bloat.
- **Target Audience:** Institute Admins, Teachers, Students, and Parents.
- **Data Isolation:** Every single record in the database is strictly scoped by `instituteId` to ensure complete data privacy between different organizations on the same platform.

## 2. Tech Stack & Architecture
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS (Custom color palette: Pine, Saffron, Paper)
- **Database ORM:** Prisma
- **Database Engine:** SQLite (Local Development) → PostgreSQL (VPS Production)
- **Authentication:** Custom JWT-based Auth (stored in HTTP-only cookies)
- **Role-Based Access Control (RBAC):** 4 roles (`admin`, `teacher`, `student`, `parent`)

---

## 3. Contributor Guidelines (The AI-Agent Workflow)
For all developers and AI agents contributing to this project, you **MUST** follow this strict daily workflow. The project maintainer reviews and merges PRs daily based on these documents.

1. **Implementation Plan (`implementation_plan.md`):** Before writing any code, analyze the assigned task and write a plan. List proposed file changes and open questions.
2. **Daily Task List (`task.md`):** Create a checklist of what you intend to accomplish today. Update it (e.g., `[x]`) as you progress.
3. **Walkthrough (`walkthrough.md`):** Start the day by noting what you intend to do. At the end of the day, update this document to summarize exactly how the feature works, what was tested, and how the UI behaves.
4. **Changelog (`LOG.md`):** Every session must be logged with key decisions, bugs fixed, and architectural choices made.

---

## 4. Master Task List

### Phase 1: Foundation & Scaffold (✅ COMPLETED)
- [x] Initial project cleanup and legacy code archival.
- [x] Next.js App Router setup with Tailwind CSS design system.
- [x] Prisma Schema definition (13 relational tables).
- [x] Authentication logic (`login`, `register-institute`, `create-user`, JWT middleware).
- [x] Dashboard UI skeleton (Sidebar, TopBar, StatCards).
- [x] Git initialization and GitHub remote connection.
- [x] Local Development Database switched to SQLite.
- [x] **Batches API:** CRUD operations + bulk student assignment.
- [x] **Subjects API:** CRUD operations.

### Phase 2: Core Entity APIs & UI Wiring (🟡 IN PROGRESS)
- [x] **Teachers API:** CRUD endpoints (ensure `isActive` soft-deletes).
- [x] **Students API:** CRUD endpoints (ensure `isActive` soft-deletes).
- [ ] **Parent-Student Linking:** API to link parent accounts to student profiles.
- [ ] **Dashboard Wiring (Admin):** Replace `InstitutionStore` (localStorage mock) with `fetch()` calls to the real APIs in:
  - [ ] `DirectoryPage` (Teachers/Students lists)
  - [ ] `AdminResourcePage` (Batches/Subjects management)

### Phase 3: Academic Operations (🟡 IN PROGRESS)
- [x] **Timetable API:** Endpoints to manage `TimetableSlot` (linking Batches, Subjects, Teachers, and Times).
- [ ] **Timetable UI:** A visual calendar/grid view for Admins to create schedules and Teachers/Students to view them.
- [ ] **Attendance API:** Endpoints for teachers to create an `AttendanceSession` and mark `AttendanceRecord` statuses.
- [ ] **Attendance UI:** A specialized, fast-input UI for teachers to mark attendance in class.

### Phase 4: Content & Assessments (🟡 IN PROGRESS)
- [ ] **Study Materials API:** Uploading and retrieving links/PDFs mapped to specific Batches & Subjects.
- [ ] **Study Materials UI:** A drive-like interface for organizing class notes.
- [x] **Homework API:** Endpoints to assign homework (assignments) and track per student.
- [ ] **Homework UI:** Teacher view (to assign/grade) and Student/Parent view (to see pending tasks).
- [ ] **Marks/Grades:** Build the schema, API, and UI for recording exam/test scores.

### Phase 5: Role-Specific Dashboards (🔴 TODO)
- [ ] **Teacher Dashboard:** Restrict views so teachers only see students in batches they are assigned to via `BatchSubjectTeacher`.
- [ ] **Student Dashboard:** Read-only views of their specific timetable, homework, and study materials.
- [ ] **Parent Dashboard:** Read-only summary of linked students' attendance, homework status, and marks.

### Phase 6: Polish & Production Readiness (🔴 TODO)
- [ ] **Error Handling:** Ensure API errors gracefully display as toast notifications in the UI.
- [ ] **Loading States:** Add Skeleton loaders for all data-fetching components.
- [ ] **Database Migration:** Switch Prisma `provider` from SQLite to PostgreSQL.
- [ ] **Seed Script:** Ensure the production database has an initial "super admin" or is ready for the first institute registration.

### Phase 7: Deployment (🔴 TODO)
- [ ] **VPS Provisioning:** Setup Ubuntu server, Node.js, PM2, and Nginx.
- [ ] **Database Hosting:** Install and configure PostgreSQL on the VPS (or use a managed DB).
- [ ] **Environment Variables:** Securely configure production secrets and database URLs.
- [ ] **Domain & SSL:** Point domain to the VPS and configure Let's Encrypt SSL.
- [ ] **CI/CD:** (Optional) Setup GitHub Actions to automatically deploy on merge to `main`.

---

## 5. AI Agent Onboarding Prompt (For New Contributors)
*Copy and paste the prompt below into your local AI agent (Cursor, Windsurf, GitHub Copilot, or standard LLM) immediately after cloning the repository. Fill in the assigned task at the very bottom.*

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

