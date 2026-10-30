import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = path.join(process.cwd(), 'data');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS teachers (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  title         TEXT NOT NULL DEFAULT '강사',      -- 표시용(원장/강사). 권한은 동일
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  grade          TEXT NOT NULL,
  pin_lookup     TEXT UNIQUE,                     -- HMAC(pin). 퇴원 시 NULL로 비워 PIN을 반납
  pin_enc        TEXT NOT NULL,                   -- AES-GCM(pin). 선생님 화면 'PIN 보기'용
  parent_phone   TEXT NOT NULL DEFAULT '',
  notify_channel TEXT NOT NULL DEFAULT 'kakao' CHECK (notify_channel IN ('kakao','sms','off')),
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id                 INTEGER PRIMARY KEY,
  name               TEXT NOT NULL,
  teacher_id         INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  room               TEXT NOT NULL DEFAULT '',
  days               TEXT NOT NULL,               -- '월,수,금'
  start_time         TEXT NOT NULL,               -- 'HH:MM'
  end_time           TEXT NOT NULL,
  late_threshold_min INTEGER NOT NULL DEFAULT 0 CHECK (late_threshold_min IN (0,5,10))
);

CREATE TABLE IF NOT EXISTS enrollments (
  course_id  INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (date('now')),  -- 이 날짜 이전은 결석으로 세지 않는다
  PRIMARY KEY (course_id, student_id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id              INTEGER PRIMARY KEY,
  student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,                  -- KST 'YYYY-MM-DD'
  check_in_at     TEXT,                           -- KST 'HH:MM'
  check_out_at    TEXT,
  course_id       INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  late_min        INTEGER NOT NULL DEFAULT 0,
  early_leave_min INTEGER NOT NULL DEFAULT 0,
  UNIQUE (student_id, date)
);
CREATE INDEX IF NOT EXISTS attendance_date ON attendance(date);

CREATE TABLE IF NOT EXISTS notifications (
  id            INTEGER PRIMARY KEY,
  attendance_id INTEGER NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('in','out')),
  channel       TEXT NOT NULL,
  status        TEXT NOT NULL,                    -- sent | failed | skipped
  sent_at       TEXT NOT NULL                     -- KST 'HH:MM'
);
`;

const g = globalThis as unknown as { __db?: Database.Database };

export function db(): Database.Database {
  if (!g.__db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const conn = new Database(path.join(DATA_DIR, 'attendance.db'));
    conn.pragma('journal_mode = WAL');
    conn.pragma('foreign_keys = ON');
    conn.exec(SCHEMA);
    g.__db = conn;
  }
  return g.__db;
}
