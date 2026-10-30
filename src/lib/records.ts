import { db } from './db';
import { coursesByStudentOn, listCourses, listStudents, type Course } from './repo';
import { addDays, dowOf, nowKst, startOfMonth, startOfWeek, toMin, type Day } from './time';

export type Period = 'today' | 'week' | 'month' | 'custom';

export type RecordFilter = {
  period: Period; from: string; to: string;
  courseId: number | null; q: string; studentId: number | null;
};

export type RecordStatus = '출석' | '지각' | '조기 하원' | '결석' | '미등원' | '확인 필요';

export type RecordRow = {
  date: string; studentId: number; name: string; grade: string; course: string;
  inT: string | null; outT: string | null; stayMin: number | null; status: RecordStatus;
};

export type RecordStats = { rate: number | null; late: number; absent: number; avgStayMin: number | null };

type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export function parseFilter(sp: SearchParams): RecordFilter {
  const today = nowKst().date;
  const period = (['today', 'week', 'month', 'custom'] as const).find(p => p === one(sp.period)) ?? 'month';
  let from = today, to = today;
  if (period === 'week') from = startOfWeek(today);
  if (period === 'month') from = startOfMonth(today);
  if (period === 'custom') {
    from = isDate(one(sp.from)) ? one(sp.from) : startOfMonth(today);
    to = isDate(one(sp.to)) ? one(sp.to) : today;
    if (from > to) [from, to] = [to, from];
  }
  const courseId = Number(one(sp.course)) || null;
  const studentId = Number(one(sp.student)) || null;
  return { period, from, to, courseId, q: one(sp.q).trim(), studentId };
}

type AttRow = {
  student_id: number; date: string; check_in_at: string | null; check_out_at: string | null;
  course_id: number | null; late_min: number; early_leave_min: number;
};

/**
 * 기간 안의 날짜 × 학생마다 한 줄. 수업이 있었는데 기록이 없으면 결석(오늘이면 미등원)으로 채운다.
 * 수강 등록일 이전 날짜는 결석으로 세지 않는다.
 */
export function queryRecords(f: RecordFilter): RecordRow[] {
  const now = nowKst();
  const courses = listCourses();
  const courseById = new Map(courses.map(c => [c.id, c]));
  const students = listStudents().filter(s =>
    (!f.q || s.name.includes(f.q)) && (!f.studentId || s.id === f.studentId));
  const enrolledSince = new Map<string, string>(
    (db().prepare('SELECT course_id, student_id, created_at FROM enrollments').all() as { course_id: number; student_id: number; created_at: string }[])
      .map(e => [`${e.course_id}:${e.student_id}`, e.created_at]),
  );
  const att = new Map(
    (db().prepare('SELECT * FROM attendance WHERE date BETWEEN ? AND ?').all(f.from, f.to) as AttRow[])
      .map(a => [`${a.date}:${a.student_id}`, a]),
  );

  const byDow = new Map<Day, Map<number, Course[]>>();
  const rows: RecordRow[] = [];
  const last = f.to < now.date ? f.to : now.date;
  for (let d = f.to; d >= f.from; d = addDays(d, -1)) {
    if (d > last) continue;
    const dow = dowOf(d);
    if (!byDow.has(dow)) byDow.set(dow, coursesByStudentOn(dow, courses));
    for (const s of students) {
      const scheduled = (byDow.get(dow)!.get(s.id) ?? []).filter(c => (enrolledSince.get(`${c.id}:${s.id}`) ?? '') <= d);
      const a = att.get(`${d}:${s.id}`);
      if (!a && !scheduled.length) continue;
      if (f.courseId && !scheduled.some(c => c.id === f.courseId) && a?.course_id !== f.courseId) continue;

      const course = f.courseId ? courseById.get(f.courseId) : (a?.course_id ? courseById.get(a.course_id) : scheduled[0]);
      let status: RecordStatus;
      if (!a) status = d === now.date ? '미등원' : '결석';
      else if (!a.check_in_at) status = '확인 필요';
      else if (a.late_min) status = '지각';
      else if (a.early_leave_min) status = '조기 하원';
      else status = '출석';
      if (status === '미등원' && scheduled[0] && toMin(scheduled[0].start) > now.minutes) continue; // 아직 수업 전

      rows.push({
        date: d, studentId: s.id, name: s.name, grade: s.grade, course: course?.name ?? '—',
        inT: a?.check_in_at ?? null, outT: a?.check_out_at ?? null,
        stayMin: a?.check_in_at && a.check_out_at ? toMin(a.check_out_at) - toMin(a.check_in_at) : null,
        status,
      });
    }
  }
  rows.sort((x, y) => (x.date === y.date ? x.name.localeCompare(y.name, 'ko') : x.date < y.date ? 1 : -1));
  return rows;
}

export function recordStats(rows: RecordRow[]): RecordStats {
  const counted = rows.filter(r => r.status !== '미등원');
  const absent = counted.filter(r => r.status === '결석').length;
  const stays = rows.map(r => r.stayMin).filter((m): m is number => m != null);
  return {
    rate: counted.length ? (counted.length - absent) / counted.length : null,
    late: rows.filter(r => r.status === '지각').length,
    absent,
    avgStayMin: stays.length ? Math.round(stays.reduce((a, b) => a + b, 0) / stays.length) : null,
  };
}

/** 이번 달 출석 '18/19일' — 수업이 있던 날 중 등원한 날 */
export function monthAttendance(studentId: number): { attended: number; scheduled: number } {
  const today = nowKst().date;
  const rows = queryRecords({ period: 'month', from: startOfMonth(today), to: today, courseId: null, q: '', studentId })
    .filter(r => r.status !== '미등원');
  return { attended: rows.filter(r => r.status !== '결석').length, scheduled: rows.length };
}
