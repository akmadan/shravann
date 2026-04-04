ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users ALTER COLUMN auth_provider DROP NOT NULL;
ALTER TABLE users ALTER COLUMN auth_provider_id DROP NOT NULL;
