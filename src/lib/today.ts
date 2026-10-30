import { db } from './db';
import { coursesByStudentOn, enrollmentMap, listCourses, listStudents } from './repo';
import { nowKst, toMin } from './time';

export type PresenceState = 'in' | 'out' | 'none';

export type TodayRow = {
  studentId: number; name: string; grade: string;
  course: string; start: string;
  inT: string | null; outT: string | null;
  state: PresenceState; lateMin: number; earlyMin: number;
  /** 등원 기록 없이 하원만 찍힌 경우 */
  needsReview: boolean;
  notify: string;
};

export type CourseBoard = {
  id: number; name: string; teacher: string; room: string; time: string;
  phase: 'upcoming' | 'live' | 'done';
  students: { name: string; state: PresenceState; note: string }[];
};

export type LogEntry = { t: string; name: string; act: '등원' | '하원'; sub: string };

export type TodaySnapshot = {
  date: string; time: string;
  rows: TodayRow[]; boards: CourseBoard[]; logs: LogEntry[];
};

type AttRow = {
  id: number; student_id: number; check_in_at: string | null; check_out_at: string | null;
  course_name: string | null; late_min: number; early_leave_min: number;
};
type NotiRow = { attendance_id: number; type: 'in' | 'out'; status: string; sent_at: string };

export function todaySnapshot(): TodaySnapshot {
  const now = nowKst();
  const courses = listCourses();
  const todays = courses.filter(c => c.days.includes(now.dow));
  const byStudent = coursesByStudentOn(now.dow, courses);
  const students = new Map(listStudents().map(s => [s.id, s]));

  const att = new Map(
    (db().prepare(`
      SELECT a.*, c.name AS course_name FROM attendance a LEFT JOIN courses c ON c.id = a.course_id
      WHERE a.date = ?`).all(now.date) as AttRow[]).map(a => [a.student_id, a]),
  );
  const notis = db().prepare(`
    SELECT n.attendance_id, n.type, n.status, n.sent_at FROM notifications n
    JOIN attendance a ON a.id = n.attendance_id WHERE a.date = ? ORDER BY n.id`).all(now.date) as NotiRow[];
  const lastNoti = new Map(notis.map(n => [n.attendance_id, n]));

  const ids = new Set([...byStudent.keys(), ...att.keys()].filter(id => students.has(id)));
  const rows: TodayRow[] = [...ids].map(id => {
    const s = students.get(id)!;
    const first = byStudent.get(id)?.[0];
    const a = att.get(id);
    const state: PresenceState = a?.check_out_at ? 'out' : a?.check_in_at ? 'in' : 'none';
    const n = a && lastNoti.get(a.id);
    const notify = n
      ? n.status === 'sent' ? `${n.type === 'in' ? '등원' : '하원'} 알림 ${n.sent_at}`
        : n.status === 'failed' ? '알림 실패' : '알림 끔'
      : state === 'none' && first && toMin(first.start) < now.minutes ? '미등원 안내 대기' : '—';
    return {
      studentId: id, name: s.name, grade: s.grade,
      course: a?.course_name ?? first?.name ?? '—', start: first?.start ?? '—',
      inT: a?.check_in_at ?? null, outT: a?.check_out_at ?? null, state,
      lateMin: a?.late_min ?? 0, earlyMin: a?.early_leave_min ?? 0,
      needsReview: !!a && !a.check_in_at, notify,
    };
  });
  // 시작 시각 → 이름 순
  rows.sort((x, y) => (x.start === y.start ? x.name.localeCompare(y.name, 'ko') : x.start < y.start ? -1 : 1));

  const enroll = enrollmentMap();
  const boards: CourseBoard[] = todays.map(c => ({
    id: c.id, name: c.name, teacher: c.teacherName, room: c.room, time: `${c.start}–${c.end}`,
    phase: toMin(c.end) <= now.minutes ? 'done' : toMin(c.start) <= now.minutes ? 'live' : 'upcoming',
    students: (enroll.get(c.id) ?? []).filter(id => students.has(id)).map(id => {
      const a = att.get(id);
      const state: PresenceState = a?.check_out_at ? 'out' : a?.check_in_at ? 'in' : 'none';
      return {
        name: students.get(id)!.name, state,
        note: state === 'out' ? `하원 ${a!.check_out_at}` : state === 'in' ? `등원 ${a!.check_in_at}` : '미등원',
      };
    }).sort((x, y) => x.name.localeCompare(y.name, 'ko')),
  }));

  const logs: LogEntry[] = [];
  for (const a of att.values()) {
    const s = students.get(a.student_id);
    if (!s) continue;
    const course = a.course_name ?? '수업 없음';
    if (a.check_in_at) logs.push({ t: a.check_in_at, name: s.name, act: '등원', sub: a.late_min ? `${course} · ${a.late_min}분 지각` : course });
    if (a.check_out_at) logs.push({
      t: a.check_out_at, name: s.name, act: '하원',
      sub: !a.check_in_at ? `${course} · 등원 기록 없음` : a.early_leave_min ? `${course} · ${a.early_leave_min}분 일찍` : course,
    });
  }
  logs.sort((x, y) => (x.t < y.t ? 1 : -1));

  return { date: now.date, time: now.time, rows, boards, logs };
}
