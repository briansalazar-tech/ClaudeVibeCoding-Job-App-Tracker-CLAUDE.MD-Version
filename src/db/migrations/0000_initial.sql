CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied',
  applied_date TEXT NOT NULL,
  last_updated TEXT NOT NULL,
  source TEXT NOT NULL,
  location TEXT,
  work_mode TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  url TEXT,
  contact_name TEXT,
  notes TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS application_events (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (application_id) REFERENCES applications(id)
);
