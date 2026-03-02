-- ============================================================
-- FORMS
-- ============================================================
CREATE TABLE forms (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    slug        TEXT        NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    created_by  UUID        NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (project_id, slug)
);

CREATE INDEX idx_forms_project ON forms(project_id);

-- ============================================================
-- FORM FIELDS
-- ============================================================
CREATE TABLE form_fields (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id     UUID        NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    key         TEXT        NOT NULL,
    label       TEXT        NOT NULL,
    type        TEXT        NOT NULL DEFAULT 'text'
                            CHECK (type IN ('text', 'email', 'phone', 'boolean', 'select', 'multi_select')),
    config      JSONB       NOT NULL DEFAULT '{}',
    validators  JSONB       NOT NULL DEFAULT '[]',
    required    BOOLEAN     NOT NULL DEFAULT false,
    position    INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (form_id, key)
);

CREATE INDEX idx_form_fields_form ON form_fields(form_id);

-- ============================================================
-- ADD form_id TO AGENTS
-- ============================================================
ALTER TABLE agents
  ADD COLUMN form_id UUID REFERENCES forms(id) ON DELETE SET NULL;
