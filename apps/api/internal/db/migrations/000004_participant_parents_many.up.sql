-- Multiple parents per participant: junction table
CREATE TABLE agent_participant_parents (
    participant_id UUID NOT NULL REFERENCES agent_participants(id) ON DELETE CASCADE,
    parent_id      UUID NOT NULL REFERENCES agent_participants(id) ON DELETE CASCADE,
    PRIMARY KEY (participant_id, parent_id),
    CHECK (participant_id != parent_id)
);

CREATE INDEX idx_participant_parents_parent ON agent_participant_parents(parent_id);

-- Migrate existing single parent into junction table
INSERT INTO agent_participant_parents (participant_id, parent_id)
SELECT id, parent_participant_id
FROM agent_participants
WHERE parent_participant_id IS NOT NULL;

-- Drop old single-parent column
DROP INDEX IF EXISTS idx_agent_participants_parent;
ALTER TABLE agent_participants DROP COLUMN IF EXISTS parent_participant_id;
