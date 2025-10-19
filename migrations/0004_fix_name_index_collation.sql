-- Migration number: 0004 	 2025-10-19T00:00:01.000Z
-- Fix name index to use COLLATE NOCASE for optimal query performance

DROP INDEX IF EXISTS idx_username_name_uploaded;
CREATE INDEX idx_username_name_uploaded ON images(username, name COLLATE NOCASE, uploaded DESC);
