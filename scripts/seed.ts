/**
 * 데모 데이터: 선생님 5명, 강의 8개, 학생 40명, 지난 30일 출결 + 오늘 지금 시각까지의 출결.
 * 실행: npm run seed  (기존 data/attendance.db 를 지우고 새로 만든다. 개발 서버는 먼저 끌 것)
 */
import fs from 'node:fs';
import path from 'node:path';
import { encryptPin, hashPassword, pinLookup } from '../src/lib/crypto';
import { DATA_DIR, db } from '../src/lib/db';
import { addDays, dowOf, fromMin, nowKst, toMin } from '../src/lib/time';

for (const f of ['attendance.db', 'attendance.db-wal', 'attendance.db-shm']) fs.rmSync(path.join(DATA_DIR, f), { force: true });
const conn = db();

// 결과가 매번 같도록 고정 시드 난수
let seed = 20261030;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const randInt = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));

const PASSWORD = 'admin1234';
const teachers: [string, string, string][] = [
  ['정민우', '원장', 'admin@saebom.kr'], ['한예린', '강사', 'yerin@saebom.kr'], ['오세진', '강사', 'sejin@saebom.kr'],
  ['윤가은', '강사', 'gaeun@saebom.kr'], ['서동하', '강사', 'dongha@saebom.kr'],
];
const tid = new Map<string, number>();
for (const [name, title, email] of teachers) {
  tid.set(name, Number(conn.prepare('INSERT INTO teachers (name, title, email, password_hash) VALUES (?, ?, ?, ?)')
    .run(name, title, email, hashPassword(PASSWORD)).lastInsertRowid));
}

const courses: [string, string, string, string, string, string, number][] = [
  // 이름, 담당, 강의실, 요일, 시작, 종료, 지각 기준
  ['중2 수학 A반', '정민우', '301호', '월,수,금', '16:00', '17:50', 0],
  ['중3 영어 심화', '한예린', '204호', '화,목,금', '16:30', '18:20', 5],
  ['고1 수학 Ⅰ', '정민우', '302호', '월,수,금', '15:50', '17:40', 0],
  ['초6 사고력 수학', '오세진', '101호', '금', '15:00', '16:20', 0],
  ['중1 과학 탐구', '서동하', '103호', '화,금', '17:00', '18:30', 10],
  ['고2 국어 문학', '윤가은', '205호', '금', '18:30', '20:20', 0],
  ['고1 영어', '한예린', '204호', '화,목', '18:30', '20:20', 5],
  ['중2 영어 B반', '한예린', '203호', '월,수', '18:00', '19:30', 5],
];
const cid = new Map<string, number>();
for (const [name, teacher, room, days, start, end, late] of courses) {
  cid.set(name, Number(conn.prepare(`INSERT INTO courses (name, teacher_id, room, days, start_time, end_time, late_threshold_min)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(name, tid.get(teacher), room, days, start, end, late).lastInsertRowid));
}

const students: [string, string, string, string?][] = [
  // 이름, 학년, 알림, 고정 PIN(데모용)
  ['김서연', '중2', 'kakao', '1234'], ['이준호', '중3', 'kakao', '2580'], ['박지민', '고1', 'sms', '0000'],
  ['최유나', '중2', 'kakao'], ['정하준', '초6', 'kakao'], ['강민서', '초6', 'off'], ['조윤우', '중3', 'kakao'],
  ['임지아', '중2', 'sms'], ['장도윤', '고1', 'kakao'], ['윤서아', '중1', 'kakao'], ['오채원', '초6', 'kakao'],
  ['한시우', '고2', 'kakao'], ['서예준', '중2', 'kakao'], ['신하린', '중2', 'kakao'], ['권주원', '중2', 'sms'],
  ['황수아', '중2', 'kakao'], ['안지호', '중3', 'kakao'], ['송다은', '중1', 'kakao'], ['류건우', '고2', 'kakao'],
  ['문서윤', '중3', 'kakao'], ['배준서', '중3', 'sms'], ['백지유', '고1', 'kakao'], ['허은우', '고1', 'kakao'],
  ['남궁민', '고2', 'kakao'], ['유하은', '중1', 'kakao'], ['노시윤', '중1', 'off'], ['구태윤', '초6', 'kakao'],
  ['차예린', '초6', 'kakao'], ['전우진', '중2', 'kakao'], ['고은서', '중3', 'kakao'], ['양지훈', '고1', 'sms'],
  ['손채아', '고2', 'kakao'], ['홍건희', '중1', 'kakao'], ['변서진', '중2', 'kakao'], ['주아인', '고1', 'kakao'],
  ['우도현', '중3', 'kakao'], ['맹소율', '고2', 'kakao'], ['진하율', '초6', 'kakao'], ['탁민재', '중1', 'kakao'],
  ['현수빈', '중2', 'kakao'],
];

const now = nowKst();
const HISTORY_DAYS = 30;
const since = addDays(now.date, -HISTORY_DAYS);
const usedPins = new Set(students.map(s => s[3]).filter(Boolean));
const sid = new Map<string, number>();
for (const [name, grade, channel, fixed] of students) {
  let pin = fixed;
  while (!pin || (!fixed && usedPins.has(pin))) pin = String(randInt(0, 9999)).padStart(4, '0');
  usedPins.add(pin);
  const phone = `010-${randInt(1000, 9999)}-${pin}`;
  sid.set(name, Number(conn.prepare(`INSERT INTO students (name, grade, pin_lookup, pin_enc, parent_phone, notify_channel, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(name, grade, pinLookup(pin), encryptPin(pin), phone, channel, since).lastInsertRowid));
}

// 학년이 맞는 강의에 배정
const enroll = conn.prepare('INSERT INTO enrollments (course_id, student_id, created_at) VALUES (?, ?, ?)');
for (const [cname] of courses) {
  for (const [sname, grade] of students) if (cname.startsWith(grade)) enroll.run(cid.get(cname), sid.get(sname), since);
}

// — 출결 —
type C = { id: number; days: string[]; start: number; end: number; late: number; name: string };
const courseRows: C[] = courses.map(([name, , , days, s, e, late]) => ({ id: cid.get(name)!, name, days: days.split(','), start: toMin(s), end: toMin(e), late }));
const byStudent = new Map<number, C[]>();
for (const r of conn.prepare('SELECT course_id, student_id FROM enrollments').all() as { course_id: number; student_id: number }[]) {
  byStudent.set(r.student_id, [...(byStudent.get(r.student_id) ?? []), courseRows.find(c => c.id === r.course_id)!]);
}
const channelOf = new Map(students.map(([n, , ch]) => [sid.get(n)!, ch]));
const insAtt = conn.prepare(`INSERT INTO attendance (student_id, date, check_in_at, check_out_at, course_id, late_min, early_leave_min)
  VALUES (?, ?, ?, ?, ?, ?, ?)`);
const insNoti = conn.prepare('INSERT INTO notifications (attendance_id, type, channel, status, sent_at) VALUES (?, ?, ?, ?, ?)');

let count = 0;
conn.transaction(() => {
  for (let d = since; d <= now.date; d = addDays(d, 1)) {
    const dow = dowOf(d);
    const isToday = d === now.date;
    for (const [studentId, list] of byStudent) {
      const today = list.filter(c => c.days.includes(dow)).sort((a, b) => a.start - b.start);
      if (!today.length) continue;
      const first = today[0], last = today.at(-1)!;
      if (isToday && first.start - 15 > now.minutes) continue; // 아직 올 시간이 아님
      if (rand() < 0.07) continue; // 결석

      const late = rand() < 0.1 ? randInt(1, 15) : 0;
      const inMin = late ? first.start + late : first.start - randInt(0, 14);
      if (isToday && inMin > now.minutes) continue;
      const lateMin = inMin - first.start > first.late ? inMin - first.start : 0;

      const early = rand() < 0.06 ? randInt(5, 30) : 0;
      let outMin: number | null = early ? last.end - early : last.end + randInt(0, 6);
      if (isToday && outMin > now.minutes) outMin = null;

      const id = Number(insAtt.run(studentId, d, fromMin(inMin), outMin == null ? null : fromMin(outMin), first.id,
        lateMin, outMin == null ? 0 : Math.max(0, last.end - outMin)).lastInsertRowid);
      const ch = channelOf.get(studentId)!;
      const st = ch === 'off' ? 'skipped' : 'sent';
      insNoti.run(id, 'in', ch, st, fromMin(inMin));
      if (outMin != null) insNoti.run(id, 'out', ch, st, fromMin(outMin));
      count++;
    }
  }
})();

console.log(`선생님 ${teachers.length}명 · 강의 ${courses.length}개 · 학생 ${students.length}명 · 출결 ${count}건 (${since} ~ ${now.date} ${now.time})`);
console.log(`로그인: admin@saebom.kr / ${PASSWORD}`);
console.log('데모 PIN: 1234(김서연) · 2580(이준호) · 0000(박지민)');
