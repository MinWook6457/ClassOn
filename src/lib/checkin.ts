import { db } from './db';
import { notifyParent } from './notify';
import { coursesByStudentOn, findStudentByPin, type Course } from './repo';
import { nowKst, toMin } from './time';

export type CheckinMode = 'in' | 'out';

export type CheckinResult = {
  ok: true;
  name: string;
  mode: CheckinMode;
  time: string;
  /** '5분 지각' · '정시 등원' · '12분 일찍 하원' · '정상 하원' · '오늘 수업 없음' */
  label: string;
  flagged: boolean;
  course: { name: string; time: string; room: string; teacher: string } | null;
  cheer: string;
  notified: boolean;
} | { ok: false; error: string; locked?: number };

// — PIN 연속 오류 잠금: 기기(IP)별 5회 실패 시 30초 —
const MAX_FAILS = 5;
const LOCK_MS = 30_000;
const fails = new Map<string, { count: number; until: number }>();

function lockedFor(key: string): number {
  const f = fails.get(key);
  return f && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 1000) : 0;
}

function recordFail(key: string) {
  const f = fails.get(key) ?? { count: 0, until: 0 };
  f.count += 1;
  if (f.count >= MAX_FAILS) { f.until = Date.now() + LOCK_MS; f.count = 0; }
  fails.set(key, f);
}

const CHEER = {
  onTime: ['일찍 왔네요! 여유 있게 준비해 봐요.', '오늘도 반가워요. 수업 화이팅!', '좋은 출발이에요. 집중해 봐요!'],
  late: ['조금 늦었지만 괜찮아요. 오늘 수업도 화이팅!', '서둘러 오느라 고생했어요. 숨 고르고 시작해요.'],
  out: ['오늘도 수고 많았어요. 조심히 들어가요!', '꾸준함이 실력이 돼요. 내일 또 만나요.'],
  early: ['오늘 일찍 가네요. 남은 과제 잊지 마세요!', '조심히 들어가요. 놓친 부분은 다음에 같이 봐요.'],
};
const pick = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)];

type AttendanceRow = { id: number; check_in_at: string | null; check_out_at: string | null };

const courseInfo = (c: Course | undefined) =>
  c ? { name: c.name, time: `${c.start}–${c.end}`, room: c.room, teacher: c.teacherName } : null;

export async function checkin(pin: string, mode: CheckinMode, clientKey: string): Promise<CheckinResult> {
  const wait = lockedFor(clientKey);
  if (wait) return { ok: false, error: `비밀번호를 여러 번 틀렸어요. ${wait}초 뒤에 다시 시도해 주세요.`, locked: wait };
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: '비밀번호 4자리를 입력해 주세요.' };

  const student = findStudentByPin(pin);
  if (!student) {
    recordFail(clientKey);
    const w = lockedFor(clientKey);
    return w
      ? { ok: false, error: `비밀번호를 5번 틀렸어요. ${w}초 뒤에 다시 시도해 주세요.`, locked: w }
      : { ok: false, error: '등록되지 않은 비밀번호예요. 다시 입력해 주세요.' };
  }
  fails.delete(clientKey);

  const now = nowKst();
  const today = coursesByStudentOn(now.dow).get(student.id) ?? [];
  const row = db().prepare('SELECT id, check_in_at, check_out_at FROM attendance WHERE student_id = ? AND date = ?')
    .get(student.id, now.date) as AttendanceRow | undefined;

  if (mode === 'in') {
    if (row?.check_in_at) return { ok: false, error: `${student.name} 학생은 이미 ${row.check_in_at}에 등원했어요.` };
    if (row?.check_out_at) return { ok: false, error: `${student.name} 학생은 오늘 이미 하원했어요. 선생님께 말씀해 주세요.` };

    // 아직 끝나지 않은 첫 강의 기준으로 지각을 판정한다.
    const course = today.find(c => toMin(c.end) > now.minutes) ?? today.at(-1);
    const diff = course ? now.minutes - toMin(course.start) : 0;
    const lateMin = course && diff > course.lateThresholdMin ? diff : 0;
    const id = Number(db().prepare(
      'INSERT INTO attendance (student_id, date, check_in_at, course_id, late_min) VALUES (?, ?, ?, ?, ?)',
    ).run(student.id, now.date, now.time, course?.id ?? null, lateMin).lastInsertRowid);
    const notified = await notifyParent(student, id, 'in', now.time);
    return {
      ok: true, name: student.name, mode, time: now.time, notified,
      label: !course ? '오늘 수업 없음' : lateMin ? `${lateMin}분 지각` : '정시 등원', flagged: lateMin > 0,
      course: courseInfo(course), cheer: pick(lateMin ? CHEER.late : CHEER.onTime),
    };
  }

  if (row?.check_out_at) return { ok: false, error: `${student.name} 학생은 이미 ${row.check_out_at}에 하원했어요.` };
  // 마지막 강의 기준으로 조기 하원을 판정한다.
  const course = today.at(-1);
  const earlyMin = course ? Math.max(0, toMin(course.end) - now.minutes) : 0;
  let id: number;
  if (row) {
    db().prepare('UPDATE attendance SET check_out_at = ?, early_leave_min = ? WHERE id = ?').run(now.time, earlyMin, row.id);
    id = row.id;
  } else {
    // 등원 기록 없이 하원: 기록은 남기고 대시보드에 '확인 필요'로 표시된다(check_in_at IS NULL).
    id = Number(db().prepare(
      'INSERT INTO attendance (student_id, date, check_out_at, course_id, early_leave_min) VALUES (?, ?, ?, ?, ?)',
    ).run(student.id, now.date, now.time, course?.id ?? null, earlyMin).lastInsertRowid);
  }
  const notified = await notifyParent(student, id, 'out', now.time);
  return {
    ok: true, name: student.name, mode, time: now.time, notified,
    label: !course ? '오늘 수업 없음' : earlyMin ? `${earlyMin}분 일찍 하원` : '정상 하원', flagged: earlyMin > 0,
    course: courseInfo(course), cheer: pick(earlyMin ? CHEER.early : CHEER.out),
  };
}
