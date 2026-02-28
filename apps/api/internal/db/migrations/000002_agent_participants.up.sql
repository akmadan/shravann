-- ============================================================
-- AGENT PARTICIPANTS (sub-agents within an agent system)
-- ============================================================
CREATE TABLE agent_participants (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id            UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    name                TEXT        NOT NULL,
    role                TEXT        NOT NULL,
    system_prompt       TEXT        NOT NULL DEFAULT '',
    model               TEXT        NOT NULL DEFAULT 'gpt-4o',
    voice_provider      TEXT,
    voice_id            TEXT,
    voice_config        JSONB       NOT NULL DEFAULT '{}',
    handoff_description TEXT        NOT NULL DEFAULT '',
    is_entry_point      BOOLEAN     NOT NULL DEFAULT false,
    position            INT         NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (agent_id, role)
);

CREATE INDEX idx_agent_participants_agent_id ON agent_participants(agent_id);

CREATE TRIGGER trg_agent_participants_updated_at
    BEFORE UPDATE ON agent_participants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
