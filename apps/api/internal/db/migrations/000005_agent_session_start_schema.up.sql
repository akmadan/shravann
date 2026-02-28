ALTER TABLE agents
  ADD COLUMN session_start_input_schema JSONB NOT NULL DEFAULT '[]';
