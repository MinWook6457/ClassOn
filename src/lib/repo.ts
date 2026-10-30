import { db } from './db';
import { decryptPin, encryptPin, pinLookup, randomPin } from './crypto';
import type { NotifyChannel } from './labels';
import { sortDays, toMin, type Day } from './time';

export type { NotifyChannel };

export type Course = {
  id: number; name: string; teacherId: number | null; teacherName: string; room: string;
  days: Day[]; start: string; end: string; lateThresholdMin: 0 | 5 | 10;
};

export type Student = {
  id: number; name: string; grade: string; parentPhone: string;
  notifyChannel: NotifyChannel; createdAt: string;
};

type CourseRow = {
  id: number; name: string; teacher_id: number | null; teacher_name: string | null; room: string;
  days: string; start_time: string; end_time: string; late_threshold_min: 0 | 5 | 10;
};

const toCourse = (r: CourseRow): Course => ({
  id: r.id, name: r.name, teacherId: r.teacher_id, teacherName: r.teacher_name ?? '', room: r.room,
  days: sortDays(r.days.split(',')), start: r.start_time, end: r.end_time, lateThresholdMin: r.late_threshold_min,
});

const COURSE_SELECT = `
  SELECT c.*, t.name AS teacher_name FROM courses c LEFT JOIN teachers t ON t.id = c.teacher_id`;

export function listCourses(): Course[] {
  return (db().prepare(`${COURSE_SELECT} ORDER BY c.start_time, c.name`).all() as CourseRow[]).map(toCourse);
}

export function getCourse(id: number): Course | null {
  const r = db().prepare(`${COURSE_SELECT} WHERE c.id = ?`).get(id) as CourseRow | undefined;
  return r ? toCourse(r) : null;
}

export function listTeachers(): { id: number; name: string; title: string }[] {
  return db().prepare('SELECT id, name, title FROM teachers ORDER BY id').all() as { id: number; name: string; title: string }[];
}

type StudentRow = {
  id: number; name: string; grade: string; parent_phone: string; notify_channel: NotifyChannel; created_at: string;
};

const toStudent = (r: StudentRow): Student => ({
  id: r.id, name: r.name, grade: r.grade, parentPhone: r.parent_phone, notifyChannel: r.notify_channel, createdAt: r.created_at,
});

export function listStudents(): Student[] {
  return (db().prepare('SELECT * FROM students WHERE active = 1 ORDER BY name').all() as StudentRow[]).map(toStudent);
}

export function getStudent(id: number): Student | null {
  const r = db().prepare('SELECT * FROM students WHERE id = ? AND active = 1').get(id) as StudentRow | undefined;
  return r ? toStudent(r) : null;
}

export function findStudentByPin(pin: string): Student | null {
  const r = db().prepare('SELECT * FROM students WHERE pin_lookup = ? AND active = 1').get(pinLookup(pin)) as StudentRow | undefined;
  return r ? toStudent(r) : null;
}

export function revealPin(studentId: number): string | null {
  const r = db().prepare('SELECT pin_enc FROM students WHERE id = ? AND active = 1').get(studentId) as { pin_enc: string } | undefined;
  return r ? decryptPin(r.pin_enc) : null;
}

/** 학원 전체에서 겹치지 않는 4자리 PIN을 만든다. */
export function uniquePin(): { pin: string; lookup: string; enc: string } {
  const taken = db().prepare('SELECT 1 FROM students WHERE pin_lookup = ?');
  for (let i = 0; i < 20000; i++) {
    const pin = randomPin();
    const lookup = pinLookup(pin);
    if (!taken.get(lookup)) return { pin, lookup, enc: encryptPin(pin) };
  }
  throw new Error('사용 가능한 PIN이 없어요.');
}

/** courseId → studentId[] */
export function enrollmentMap(): Map<number, number[]> {
  const m = new Map<number, number[]>();
  for (const e of db().prepare('SELECT course_id, student_id FROM enrollments').all() as { course_id: number; student_id: number }[]) {
    m.set(e.course_id, [...(m.get(e.course_id) ?? []), e.student_id]);
  }
  return m;
}

/** studentId → 그 요일에 듣는 강의(시작 시각순) */
export function coursesByStudentOn(dow: Day, courses = listCourses()): Map<number, Course[]> {
  const enroll = enrollmentMap();
  const m = new Map<number, Course[]>();
  for (const c of courses.filter(c => c.days.includes(dow))) {
    for (const sid of enroll.get(c.id) ?? []) m.set(sid, [...(m.get(sid) ?? []), c]);
  }
  for (const list of m.values()) list.sort((a, b) => toMin(a.start) - toMin(b.start));
  return m;
}

export function studentCourses(studentId: number): Course[] {
  const ids = new Set(
    (db().prepare('SELECT course_id FROM enrollments WHERE student_id = ?').all(studentId) as { course_id: number }[]).map(r => r.course_id),
  );
  return listCourses().filter(c => ids.has(c.id));
}

/** 같은 학생이 같은 요일, 겹치는 시간에 다른 강의에도 있으면 알려 준다. */
export function overlapWarnings(courseId: number): string[] {
  const courses = listCourses();
  const me = courses.find(c => c.id === courseId)!;
  const names = new Map(listStudents().map(s => [s.id, s.name]));
  const rows = db().prepare(`
    SELECT e2.student_id, e2.course_id FROM enrollments e1
    JOIN enrollments e2 ON e2.student_id = e1.student_id AND e2.course_id != e1.course_id
    WHERE e1.course_id = ?`).all(courseId) as { student_id: number; course_id: number }[];
  const out: string[] = [];
  for (const r of rows) {
    const other = courses.find(c => c.id === r.course_id);
    if (!other || !names.has(r.student_id)) continue;
    const shared = me.days.filter(d => other.days.includes(d));
    const overlap = toMin(me.start) < toMin(other.end) && toMin(other.start) < toMin(me.end);
    if (shared.length && overlap) {
      out.push(`${names.get(r.student_id)} 학생이 ${other.name}(${shared.join('·')} ${other.start}–${other.end})과 시간이 겹쳐요.`);
    }
  }
  return out;
}
