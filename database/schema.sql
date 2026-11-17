PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS cabinet (
 cabinet_id INTEGER PRIMARY KEY, mode TEXT NOT NULL CHECK(mode IN ('HOME','PUBLIC'))
);
INSERT OR IGNORE INTO cabinet VALUES (1, 'HOME');
CREATE TABLE IF NOT EXISTS compartment (
 compartment_id INTEGER PRIMARY KEY, shoe_status TEXT NOT NULL DEFAULT 'EMPTY',
 door_status TEXT NOT NULL DEFAULT 'CLOSED', updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS storage_session (
 session_id INTEGER PRIMARY KEY, cabinet_id INTEGER NOT NULL REFERENCES cabinet,
 compartment_id INTEGER NOT NULL REFERENCES compartment, user_id INTEGER,
 auth_type TEXT, session_status TEXT NOT NULL,
 reserved_at TEXT NOT NULL, started_at TEXT, ended_at TEXT,
 password_hash TEXT, token_hash TEXT, token_expires_at TEXT,
 reservation_expires_at TEXT NOT NULL, checkout_requested_at TEXT,
 checkout_open_confirmed INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS one_live_session ON storage_session(compartment_id)
 WHERE session_status IN ('RESERVED','ACTIVE');
CREATE TABLE IF NOT EXISTS access_token (
 token_hash TEXT PRIMARY KEY, session_id INTEGER REFERENCES storage_session,
 role TEXT NOT NULL, expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_attempt (
 scope TEXT PRIMARY KEY, failures INTEGER NOT NULL, locked_until TEXT
);
CREATE TABLE IF NOT EXISTS shoe_event (
 event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, cabinet_id INTEGER NOT NULL,
 compartment_id INTEGER, session_id INTEGER, occurred_at TEXT NOT NULL, details TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drying_session (
 drying_id INTEGER PRIMARY KEY, compartment_id INTEGER NOT NULL REFERENCES compartment,
 session_id INTEGER REFERENCES storage_session, started_at TEXT NOT NULL, ended_at TEXT,
 initial_temperature REAL, initial_humidity REAL, final_humidity REAL,
 external_humidity REAL, duration_seconds INTEGER, result TEXT NOT NULL
);
