-- Add self-referencing parent_participant_id for tree hierarchy
ALTER TABLE agent_participants
    ADD COLUMN parent_participant_id UUID REFERENCES agent_participants(id) ON DELETE SET NULL;

CREATE INDEX idx_agent_participants_parent ON agent_participants(parent_participant_id);
