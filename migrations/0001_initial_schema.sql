-- Migration number: 0001 	 2025-10-05T13:32:21.505Z
CREATE TABLE images (
  id TEXT PRIMARY KEY NOT NULL,     -- Cloudflare Images ID
  username TEXT NOT NULL,           -- Owner username
  name TEXT NOT NULL,               -- Display name (e.g., "IMG_3818")
  caption TEXT,                     -- Optional caption
  captured TEXT NOT NULL,           -- ISO8601 date when photo was captured
  uploaded TEXT NOT NULL,           -- ISO8601 date when uploaded
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_username_uploaded ON images(username, uploaded DESC);
