DROP INDEX IF EXISTS idx_agent_participants_parent;
ALTER TABLE agent_participants DROP COLUMN IF EXISTS parent_participant_id;
