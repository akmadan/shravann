DROP TRIGGER IF EXISTS trg_agents_updated_at   ON agents;
DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS trg_users_updated_at    ON users;
DROP FUNCTION IF EXISTS set_updated_at();

DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

DROP EXTENSION IF EXISTS "pgcrypto";
