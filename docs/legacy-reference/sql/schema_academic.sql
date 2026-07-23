-- Prabodha — Modules 3–6: Teacher, Student, Batch & Subject Management
-- Run this in Supabase's SQL Editor AFTER schema.sql (Module 1).

-- A student's grouping, e.g. "Class 11 Science Maths".
CREATE TABLE IF NOT EXISTS batches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institute_id, name)
);

-- Catalog of subjects an institute teaches, e.g. "Physics", "Computer Science".
-- Reusable across batches — the actual teacher+batch pairing lives in the
-- junction table below, per Module 6 ("create subject, assign teacher, assign batch").
CREATE TABLE IF NOT EXISTS subjects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institute_id, name)
);

-- One row = "this teacher teaches this subject to this batch".
-- This single table is what powers:
--   - Module 6 (Subject Management: assign teacher + batch to a subject)
--   - Module 3 (Teacher Management: "assign subjects" / "assign batches")
--   - Module 5 (Batch Management: "assign teachers")
CREATE TABLE IF NOT EXISTS batch_subject_teacher (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  batch_id     UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject_id   UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, subject_id) -- one subject can only have one teacher per batch in V1
);

-- Students belong to exactly one batch (per SRS business rules).
-- Nullable because a student can exist before being assigned a batch,
-- and it's meaningless for admin/teacher/parent roles.
ALTER TABLE users ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(id) ON DELETE SET NULL;

-- A few extra profile fields the PRD calls for on teachers and students.
ALTER TABLE users ADD COLUMN IF NOT EXISTS qualification TEXT;      -- teacher-only, ignored for other roles
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_years INT;    -- teacher-only
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;      -- student-only
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;            -- student-only
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_name TEXT;        -- student-only (quick text field; full parent *accounts* are role='parent' users, linked below)
ALTER TABLE users ADD COLUMN IF NOT EXISTS enrollment_date DATE DEFAULT CURRENT_DATE; -- student-only

-- Links a parent LOGIN to the student they're allowed to view.
-- A parent can have more than one child at the same institute, so this is
-- its own table rather than a single column on users.
CREATE TABLE IF NOT EXISTS parent_student_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  parent_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_bst_institute ON batch_subject_teacher(institute_id);
CREATE INDEX IF NOT EXISTS idx_bst_teacher ON batch_subject_teacher(teacher_id);
CREATE INDEX IF NOT EXISTS idx_bst_batch ON batch_subject_teacher(batch_id);
CREATE INDEX IF NOT EXISTS idx_users_batch ON users(batch_id);
CREATE INDEX IF NOT EXISTS idx_psl_parent ON parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_psl_student ON parent_student_links(student_id);
