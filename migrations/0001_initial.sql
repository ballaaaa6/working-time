PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE work_schedules (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  is_work_day INTEGER NOT NULL DEFAULT 1 CHECK (is_work_day IN (0,1)),
  start_time TEXT NOT NULL DEFAULT '09:00',
  end_time TEXT NOT NULL DEFAULT '18:00',
  late_threshold_minutes INTEGER NOT NULL DEFAULT 15 CHECK (late_threshold_minutes BETWEEN 0 AND 180),
  PRIMARY KEY (user_id, weekday)
);

CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PRESENT','LATE','ABSENT','LEAVE','DAY_OFF')),
  check_in_at TEXT,
  check_out_at TEXT,
  note TEXT,
  UNIQUE (user_id, date)
);
CREATE INDEX attendance_user_date_idx ON attendance(user_id, date);

CREATE TABLE leave_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('SICK','PERSONAL','VACATION')),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, date)
);
CREATE INDEX leave_user_date_idx ON leave_requests(user_id, date);
