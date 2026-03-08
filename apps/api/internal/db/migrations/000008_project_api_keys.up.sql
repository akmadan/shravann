CREATE TABLE project_api_keys (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider      TEXT        NOT NULL,
    encrypted_key BYTEA       NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, provider)
);

CREATE INDEX idx_project_api_keys_project ON project_api_keys(project_id);
