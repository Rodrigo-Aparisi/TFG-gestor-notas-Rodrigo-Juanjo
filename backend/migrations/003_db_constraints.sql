-- backend/migrations/003_db_constraints.sql
-- Adds CHECK constraints, partial indexes, end_date NOT NULL, and replaces weak index
-- Run with: psql -U $DB_USER -d $DB_NAME -f backend/migrations/003_db_constraints.sql

BEGIN;

-- ── 1. CHECK constraints on role and frequency columns ────────────────────────

ALTER TABLE group_members
  DROP CONSTRAINT IF EXISTS group_members_role_check;

ALTER TABLE group_members
  ADD CONSTRAINT group_members_role_check
  CHECK (role IN ('owner', 'admin', 'member'));

ALTER TABLE reminder_recurrence
  DROP CONSTRAINT IF EXISTS reminder_recurrence_frequency_check;

ALTER TABLE reminder_recurrence
  ADD CONSTRAINT reminder_recurrence_frequency_check
  CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly'));

-- ── 2. Partial indexes for soft-delete queries on notes ───────────────────────

CREATE INDEX IF NOT EXISTS idx_notes_active
  ON notes(user_id, updated_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_notes_trash
  ON notes(user_id, deleted_at DESC)
  WHERE is_deleted = true;

-- ── 3. end_date NOT NULL with 1-year default (prevents infinite recurrence) ───

UPDATE reminder_recurrence
  SET end_date = created_at + INTERVAL '1 year'
  WHERE end_date IS NULL;

ALTER TABLE reminder_recurrence
  ALTER COLUMN end_date SET NOT NULL;

ALTER TABLE reminder_recurrence
  ALTER COLUMN end_date SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 year');

-- ── 4. Replace low-selectivity boolean index with useful compound index ────────

DROP INDEX IF EXISTS idx_shared_notes_can_edit;

CREATE INDEX IF NOT EXISTS idx_shared_notes_perms
  ON shared_notes(shared_with_id, can_edit)
  INCLUDE (note_id);

COMMIT;
