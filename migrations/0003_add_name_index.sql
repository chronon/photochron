-- Migration number: 0003 	 2025-10-19T00:00:00.000Z
-- Add index for lookup by name (supports /admin/api/images/by-name endpoint)

CREATE INDEX idx_username_name_uploaded ON images(username, name, uploaded DESC);
