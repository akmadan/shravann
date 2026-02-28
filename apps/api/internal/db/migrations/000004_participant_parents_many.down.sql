ALTER TABLE agent_participants
    ADD COLUMN parent_participant_id UUID REFERENCES agent_participants(id) ON DELETE SET NULL;

-- Restore first parent from junction (arbitrary if multiple)
UPDATE agent_participants ap
SET parent_participant_id = (
    SELECT parent_id FROM agent_participant_parents app
    WHERE app.participant_id = ap.id
    LIMIT 1
);

CREATE INDEX idx_agent_participants_parent ON agent_participants(parent_participant_id);

DROP INDEX IF EXISTS idx_participant_parents_parent;
DROP TABLE IF EXISTS agent_participant_parents;
