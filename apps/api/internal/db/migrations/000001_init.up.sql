CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT        NOT NULL UNIQUE,
    name          TEXT        NOT NULL,
    avatar_url    TEXT,
    auth_provider    TEXT     NOT NULL,
    auth_provider_id TEXT     NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (auth_provider, auth_provider_id)
);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE projects (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    slug        TEXT        NOT NULL UNIQUE,
    created_by  UUID        NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_created_by ON projects(created_by);

-- ============================================================
-- PROJECT MEMBERS
-- ============================================================
CREATE TABLE project_members (
    project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        TEXT        NOT NULL DEFAULT 'member'
                            CHECK (role IN ('owner', 'admin', 'member')),
    invited_by  UUID        REFERENCES users(id),
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- ============================================================
-- AGENTS
-- ============================================================
CREATE TABLE agents (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name           TEXT        NOT NULL,
    slug           TEXT        NOT NULL,
    system_prompt  TEXT        NOT NULL DEFAULT '',
    model          TEXT        NOT NULL DEFAULT 'gpt-4o',
    voice_provider TEXT,
    voice_config   JSONB       NOT NULL DEFAULT '{}',
    language       TEXT        NOT NULL DEFAULT 'en',
    metadata       JSONB       NOT NULL DEFAULT '{}',
    is_active      BOOLEAN     NOT NULL DEFAULT true,
    created_by     UUID        NOT NULL REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (project_id, slug)
);

CREATE INDEX idx_agents_project_id ON agents(project_id);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE sessions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id         UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    external_user_id TEXT,
    channel          TEXT        NOT NULL DEFAULT 'chat'
                                 CHECK (channel IN ('chat', 'voice', 'api')),
    status           TEXT        NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'ended', 'error')),
    metadata         JSONB       NOT NULL DEFAULT '{}',
    started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at         TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_agent_id ON sessions(agent_id);
CREATE INDEX idx_sessions_status   ON sessions(status);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_agents_updated_at
    BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
