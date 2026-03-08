CREATE TABLE session_transcripts (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role       TEXT        NOT NULL CHECK (role IN ('agent', 'user')),
    content    TEXT        NOT NULL,
    position   INT         NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_transcripts_session ON session_transcripts(session_id);
