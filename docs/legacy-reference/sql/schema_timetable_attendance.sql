-- Prabodha — Modules 7–8: Timetable & Attendance
-- Run this in Supabase's SQL Editor AFTER schema.sql and schema_academic.sql.

-- One row = one weekly recurring class slot, tied to an existing
-- batch+subject+teacher assignment (from Module 6).
CREATE TABLE IF NOT EXISTS timetable_slots (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id             UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  batch_subject_teacher_id UUID NOT NULL REFERENCES batch_subject_teacher(id) ON DELETE CASCADE,
  day_of_week              SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday .. 6=Saturday
  start_time               TIME NOT NULL,
  end_time                 TIME NOT NULL,
  classroom                TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_timetable_institute ON timetable_slots(institute_id);
CREATE INDEX IF NOT EXISTS idx_timetable_bst ON timetable_slots(batch_subject_teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day ON timetable_slots(day_of_week);

-- One attendance session = one teacher, one batch+subject, one calendar date.
-- Splitting session (metadata) from records (per-student) keeps "who marked
-- this, and when" separate from the actual present/absent list.
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id             UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  batch_subject_teacher_id UUID NOT NULL REFERENCES batch_subject_teacher(id) ON DELETE CASCADE,
  session_date             DATE NOT NULL,
  marked_by                UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  submitted_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- one session per batch+subject+day — re-submitting updates records, not a duplicate session
  UNIQUE (batch_subject_teacher_id, session_date)
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_att_sessions_institute ON attendance_sessions(institute_id);
CREATE INDEX IF NOT EXISTS idx_att_sessions_date ON attendance_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_att_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_att_records_student ON attendance_records(student_id);
