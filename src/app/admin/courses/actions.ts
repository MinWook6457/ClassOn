'use server';

import { revalidatePath } from 'next/cache';
import { requireTeacher } from '@/lib/auth';
import { db } from '@/lib/db';
import { DAYS, nowKst, toMin } from '@/lib/time';

export type CourseInput = {
  id: number | null; name: string; teacherId: number | null; room: string;
  days: string[]; start: string; end: string; lateThresholdMin: number; studentIds: number[];
};

export type SaveResult = { ok: true; id: number } | { ok: false; error: string };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function saveCourse(input: CourseInput): Promise<SaveResult> {
  await requireTeacher();
  const name = input.name.trim();
  const days = DAYS.filter(d => input.days.includes(d));
  if (!name) return { ok: false, error: '강의명을 입력해 주세요.' };
  if (!days.length) return { ok: false, error: '요일을 하나 이상 골라 주세요.' };
  if (!TIME.test(input.start) || !TIME.test(input.end)) return { ok: false, error: '시작·종료 시간을 확인해 주세요.' };
  if (toMin(input.end) <= toMin(input.start)) return { ok: false, error: '종료 시간은 시작 시간보다 늦어야 해요.' };
  const late = [0, 5, 10].includes(input.lateThresholdMin) ? input.lateThresholdMin : 0;
  const studentIds = [...new Set(input.studentIds)];

  const conn = db();
  const id = conn.transaction(() => {
    let courseId = input.id;
    const values = [name, input.teacherId, input.room.trim(), days.join(','), input.start, input.end, late];
    if (courseId) {
      conn.prepare(`UPDATE courses SET name = ?, teacher_id = ?, room = ?, days = ?, start_time = ?, end_time = ?, late_threshold_min = ?
        WHERE id = ?`).run(...values, courseId);
    } else {
      courseId = Number(conn.prepare(`INSERT INTO courses (name, teacher_id, room, days, start_time, end_time, late_threshold_min)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(...values).lastInsertRowid);
    }
    // 기존 수강생의 등록일은 유지하고, 빠진 학생만 지우고 새 학생만 넣는다.
    const keep = new Set(studentIds);
    const current = (conn.prepare('SELECT student_id FROM enrollments WHERE course_id = ?').all(courseId) as { student_id: number }[])
      .map(r => r.student_id);
    const del = conn.prepare('DELETE FROM enrollments WHERE course_id = ? AND student_id = ?');
    for (const sid of current) if (!keep.has(sid)) del.run(courseId, sid);
    const add = conn.prepare('INSERT OR IGNORE INTO enrollments (course_id, student_id, created_at) VALUES (?, ?, ?)');
    const today = nowKst().date;
    for (const sid of studentIds) add.run(courseId, sid, today);
    return courseId;
  })();

  revalidatePath('/admin', 'layout');
  return { ok: true, id };
}

export async function deleteCourse(id: number) {
  await requireTeacher();
  db().prepare('DELETE FROM courses WHERE id = ?').run(id);
  revalidatePath('/admin', 'layout');
}
