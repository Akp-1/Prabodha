# Prabodha — API Reference

Complete reference for all REST API endpoints currently available in the Prabodha platform.

> **Auth:** All endpoints (except register-institute and login) require `Authorization: Bearer <token>` header.

---

## Authentication (`/api/auth/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register-institute` | Public | Register a new institute + admin account |
| `POST` | `/api/auth/login` | Public | Log in with email + password, returns JWT |
| `POST` | `/api/auth/logout` | Any Auth | Invalidate session (client-side token clear) |
| `GET`  | `/api/auth/me` | Any Auth | Get current user's profile |
| `POST` | `/api/auth/create-user` | Admin | Create a new user (teacher/student/parent) |
| `POST` | `/api/auth/forgot-password` | Public | Request a password reset token |
| `POST` | `/api/auth/reset-password` | Public | Reset password using token |

---

## Batches (`/api/batches/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/batches` | Any Auth | List all batches (with `_count.students`) |
| `POST` | `/api/batches` | Admin | Create batch. Body: `{ name: string }` |
| `GET` | `/api/batches/:id` | Any Auth | Batch detail with students + subject-teacher assignments |
| `PATCH` | `/api/batches/:id` | Admin | Update batch. Body: `{ name?: string }` |
| `DELETE` | `/api/batches/:id` | Admin | Hard delete batch |
| `POST` | `/api/batches/:id/students` | Admin | Bulk-assign students. Body: `{ studentIds: string[] }` |

---

## Subjects (`/api/subjects/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/subjects` | Any Auth | List all subjects |
| `POST` | `/api/subjects` | Admin | Create subject. Body: `{ name: string }` |
| `GET` | `/api/subjects/:id` | Any Auth | Subject detail |
| `PATCH` | `/api/subjects/:id` | Admin | Update subject. Body: `{ name?: string }` |
| `DELETE` | `/api/subjects/:id` | Admin | Hard delete subject |

---

## Teachers (`/api/teachers/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/teachers` | Any Auth | List active teachers. `?includeInactive=true` to include deactivated |
| `POST` | `/api/teachers` | Admin | Create teacher. Body: `{ name, email, password, phone?, qualification?, experienceYears? }` |
| `GET` | `/api/teachers/:id` | Any Auth | Teacher detail |
| `PATCH` | `/api/teachers/:id` | Admin | Update teacher profile |
| `DELETE` | `/api/teachers/:id` | Admin | Soft delete (sets `isActive: false`) |

---

## Students (`/api/students/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/students` | Admin / Teacher | List students. Admin: all. Teacher: only students in assigned batches. `?batchId=` filter, `?includeInactive=true` |
| `POST` | `/api/students` | Admin | Create student. Body: `{ name, email, password, phone?, dateOfBirth?, address?, parentName?, batchId? }` |
| `GET` | `/api/students/:id` | Admin / Teacher | Student detail. Teacher: 403 if student is not in an assigned batch |
| `PATCH` | `/api/students/:id` | Admin | Update student profile |
| `DELETE` | `/api/students/:id` | Admin | Soft delete (sets `isActive: false`) |

---

## Assignments (`/api/assignments/`)

Manages `BatchSubjectTeacher` records — "teacher X teaches subject Y to batch Z."

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/assignments` | Admin / Teacher | List assignments. Admin: all, filterable by `?batchId=`, `?subjectId=`, `?teacherId=`. Teacher: own only |
| `POST` | `/api/assignments` | Admin | Create assignment. Body: `{ batchId, subjectId, teacherId }` |
| `GET` | `/api/assignments/:id` | Admin / Teacher | Assignment detail. Teacher: own only, else 403 |
| `PATCH` | `/api/assignments/:id` | Admin | Reassign teacher. Body: `{ teacherId }` |
| `DELETE` | `/api/assignments/:id` | Admin | Hard delete assignment |

---

## Timetable (`/api/timetable/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/timetable` | Admin / Teacher | List slots. Admin: all, filterable by `?batchId=`, `?dayOfWeek=`. Teacher: own schedule only |
| `POST` | `/api/timetable` | Admin | Create slot. Body: `{ batchSubjectTeacherId, dayOfWeek (0-6), startTime (HH:MM), endTime (HH:MM), classroom? }`. Checks for teacher/batch/classroom conflicts |
| `GET` | `/api/timetable/:id` | Admin / Teacher | Slot detail |
| `PATCH` | `/api/timetable/:id` | Admin | Update day/time/classroom. Re-checks conflicts |
| `DELETE` | `/api/timetable/:id` | Admin | Hard delete slot |

---

## Parents (`/api/parents/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/parents` | Admin | List active parents with linked students. `?includeInactive=true` to include deactivated |
| `POST` | `/api/parents` | Admin | Create parent. Body: `{ name, email, password, phone? }` |
| `GET` | `/api/parents/:id` | Admin | Parent detail with linked students |
| `PATCH` | `/api/parents/:id` | Admin | Update parent profile. Body: `{ name?, phone?, isActive? }` |
| `DELETE` | `/api/parents/:id` | Admin | Soft delete (sets `isActive: false`) |

---

## Parent-Student Links (`/api/parent-student-links/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/parent-student-links` | Admin | List all links. `?parentId=` and `?studentId=` filters |
| `POST` | `/api/parent-student-links` | Admin | Create link. Body: `{ parentId, studentId }`. Validates roles and institute ownership. Duplicate → 409 |
| `DELETE` | `/api/parent-student-links/:id` | Admin | Hard delete link |

---

## Not Yet Implemented

The following APIs are tracked in `ROADMAP.md` and do not exist yet:

- **Attendance API** — Create sessions, mark student attendance
- **Study Materials API** — Upload and retrieve learning materials
- **Homework API** — Assign homework, track student completion
- **Marks/Grades API** — Record and retrieve exam scores
- **Institute Profile API** — Update institute settings

