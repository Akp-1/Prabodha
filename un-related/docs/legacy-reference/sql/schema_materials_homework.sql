-- Prabodha — Modules 9–10: Study Material & Homework
-- Run this in Supabase's SQL Editor AFTER the previous three schema files.
--
-- Before using file uploads, also create a Storage bucket named
-- "prabodha-files" in the Supabase dashboard (Storage -> New bucket ->
-- make it Public, since we serve files via public URL).

CREATE TABLE IF NOT EXISTS study_materials (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  batch_id     UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject_id   UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  uploaded_by  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  material_type TEXT NOT NULL CHECK (material_type IN ('pdf', 'image', 'note', 'link')),
  file_url     TEXT,   -- populated for pdf/image/note (uploaded files)
  file_path    TEXT,   -- storage path, needed to delete the file later
  external_link TEXT,  -- populated for material_type = 'link'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (material_type = 'link' AND external_link IS NOT NULL) OR
    (material_type != 'link' AND file_url IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS homework (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  batch_id     UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject_id   UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  assigned_by  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  due_date     DATE NOT NULL,
  file_url     TEXT,
  file_path    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-student completion tracking — this is what "parents can monitor
-- homework status" (PRD Module 10) actually reads from. A row is created
-- for every student in the batch when homework is assigned, defaulting to
-- 'pending'; the teacher updates it as students turn work in.
CREATE TABLE IF NOT EXISTS homework_status (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (homework_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_material_institute ON study_materials(institute_id);
CREATE INDEX IF NOT EXISTS idx_material_batch ON study_materials(batch_id);
CREATE INDEX IF NOT EXISTS idx_homework_institute ON homework(institute_id);
CREATE INDEX IF NOT EXISTS idx_homework_batch ON homework(batch_id);
CREATE INDEX IF NOT EXISTS idx_hwstatus_homework ON homework_status(homework_id);
CREATE INDEX IF NOT EXISTS idx_hwstatus_student ON homework_status(student_id);
