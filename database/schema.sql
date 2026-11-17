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

CREATE TABLE IF NOT EXISTS compartment (
  compartment_id INTEGER PRIMARY KEY,
  cabinet_id INTEGER NOT NULL REFERENCES cabinet(cabinet_id),
  compartment_number INTEGER NOT NULL,
  availability TEXT NOT NULL DEFAULT 'AVAILABLE',
  shoe_status TEXT NOT NULL DEFAULT 'UNKNOWN',
  drying_status TEXT NOT NULL DEFAULT 'IDLE',
  fan_status TEXT NOT NULL DEFAULT 'OFF',
  door_status TEXT NOT NULL DEFAULT 'CLOSED',
  temperature REAL, humidity REAL, updated_at TEXT,
  UNIQUE(cabinet_id, compartment_number)
);
CREATE TABLE IF NOT EXISTS app_user (
  user_id INTEGER PRIMARY KEY,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'USER', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS storage_session (
  session_id INTEGER PRIMARY KEY,
  compartment_id INTEGER NOT NULL REFERENCES compartment(compartment_id),
  user_id INTEGER REFERENCES app_user(user_id),
  auth_type TEXT NOT NULL, session_status TEXT NOT NULL,
  token_hash TEXT UNIQUE,
  reserved_at TEXT NOT NULL, token_expires_at TEXT,
  started_at TEXT, ended_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS active_storage_slot
 ON storage_session(compartment_id)
 WHERE session_status IN ('RESERVED','ACTIVE');
CREATE TABLE IF NOT EXISTS sensor_reading (
  reading_id INTEGER PRIMARY KEY,
  compartment_id INTEGER NOT NULL REFERENCES compartment(compartment_id),
  temperature REAL, humidity REAL, external_humidity REAL,
  fan_status TEXT NOT NULL, measured_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reading_slot_time
 ON sensor_reading(compartment_id, measured_at);
CREATE TABLE IF NOT EXISTS shoe_event (
  event_id TEXT PRIMARY KEY,
  compartment_id INTEGER REFERENCES compartment(compartment_id),
  session_id INTEGER REFERENCES storage_session(session_id),
  event_type TEXT NOT NULL, occurred_at TEXT NOT NULL, details_json TEXT
);
CREATE TABLE IF NOT EXISTS drying_session (
  drying_id INTEGER PRIMARY KEY,
  compartment_id INTEGER NOT NULL REFERENCES compartment(compartment_id),
  session_id INTEGER REFERENCES storage_session(session_id),
  started_at TEXT NOT NULL, ended_at TEXT,
  initial_humidity REAL, final_humidity REAL,
  duration_seconds INTEGER, result TEXT
);
