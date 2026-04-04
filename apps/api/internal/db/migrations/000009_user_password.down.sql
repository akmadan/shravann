ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL;
UPDATE users SET auth_provider_id = id::text WHERE auth_provider_id IS NULL;

ALTER TABLE users ALTER COLUMN auth_provider SET NOT NULL;
ALTER TABLE users ALTER COLUMN auth_provider_id SET NOT NULL;
