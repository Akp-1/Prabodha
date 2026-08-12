-- Prabodha — Module 1: Authentication schema
-- Run this once in Supabase's SQL Editor (or via psql) before starting the server.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gives us gen_random_uuid()

-- One row per coaching institute. Every other table hangs off institute_id.
CREATE TABLE IF NOT EXISTS institutes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,          -- e.g. "vector-classes", used in URLs/subdomains later
  logo_url      TEXT,
  academic_year TEXT,                          -- e.g. "2026-27"
  working_days  TEXT[] DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri','Sat'],
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per user, of any role. institute_id enforces the "every user
-- belongs to exactly one institute" rule from the SRS business rules.
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id  UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('admin','teacher','student','parent')),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,  -- lets an Admin disable a login without deleting the record
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- email only has to be unique WITHIN an institute, not globally —
  -- two different institutes can each have a teacher@gmail.com
  UNIQUE (institute_id, email)
);

-- Used for the "forgot password" flow (FR-01).
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_institute ON users(institute_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
