-- backend/migrations/002_note_groups_fk_index.sql
-- Adds ON DELETE CASCADE and index on note_groups.user_id
-- Run with: psql -U $DB_USER -d $DB_NAME -f migrations/002_note_groups_fk_index.sql

BEGIN;

-- Drop existing FK without cascade
ALTER TABLE note_groups
  DROP CONSTRAINT IF EXISTS note_groups_user_id_fkey;

-- Re-add with cascade delete
ALTER TABLE note_groups
  ADD CONSTRAINT note_groups_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add missing performance index
CREATE INDEX IF NOT EXISTS idx_note_groups_user_id ON note_groups(user_id);

COMMIT;
