-- Migration number: 0002 	 2025-10-17T00:00:00.000Z
-- Change primary sort order from uploaded date to captured date

DROP INDEX idx_username_uploaded;

CREATE INDEX idx_username_captured ON images(username, captured DESC);
