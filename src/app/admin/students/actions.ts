'use server';

import { revalidatePath } from 'next/cache';
import { requireTeacher } from '@/lib/auth';
import { db } from '@/lib/db';
import { revealPin, uniquePin, type NotifyChannel } from '@/lib/repo';
import { nowKst } from '@/lib/time';

export type StudentInput = { name: string; grade: string; parentPhone: string; notifyChannel: NotifyChannel };

const CHANNELS: NotifyChannel[] = ['kakao', 'sms', 'off'];

function validate(input: StudentInput): string | null {
  if (!input.name.trim()) return '이름을 입력해 주세요.';
  if (!input.grade.trim()) return '학년을 입력해 주세요.';
  if (input.parentPhone && !/^[\d-]{9,13}$/.test(input.parentPhone.trim())) return '연락처는 숫자와 - 만 입력해 주세요.';
  if (!CHANNELS.includes(input.notifyChannel)) return '알림 방식을 골라 주세요.';
  return null;
}

export async function createStudent(input: StudentInput): Promise<{ ok: true; id: number; pin: string } | { ok: false; error: string }> {
  await requireTeacher();
  const error = validate(input);
  if (error) return { ok: false, error };
  const { pin, lookup, enc } = uniquePin();
  const id = Number(db().prepare(`INSERT INTO students (name, grade, pin_lookup, pin_enc, parent_phone, notify_channel, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    input.name.trim(), input.grade.trim(), lookup, enc, input.parentPhone.trim(), input.notifyChannel, nowKst().date,
  ).lastInsertRowid);
  revalidatePath('/admin', 'layout');
  return { ok: true, id, pin };
}

export async function updateStudent(id: number, input: StudentInput): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireTeacher();
  const error = validate(input);
  if (error) return { ok: false, error };
  db().prepare('UPDATE students SET name = ?, grade = ?, parent_phone = ?, notify_channel = ? WHERE id = ?')
    .run(input.name.trim(), input.grade.trim(), input.parentPhone.trim(), input.notifyChannel, id);
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function setNotifyChannel(id: number, channel: NotifyChannel) {
  await requireTeacher();
  if (!CHANNELS.includes(channel)) return;
  db().prepare('UPDATE students SET notify_channel = ? WHERE id = ?').run(channel, id);
  revalidatePath('/admin', 'layout');
}

export async function revealStudentPin(id: number): Promise<string | null> {
  await requireTeacher();
  return revealPin(id);
}

/** 새 PIN을 발급한다. 이전 PIN은 즉시 쓸 수 없게 된다. */
export async function reissuePin(id: number): Promise<string> {
  await requireTeacher();
  const { pin, lookup, enc } = uniquePin();
  db().prepare('UPDATE students SET pin_lookup = ?, pin_enc = ? WHERE id = ? AND active = 1').run(lookup, enc, id);
  return pin;
}

/** 퇴원 처리. 기록은 남기고 목록·강의에서 빼며, PIN을 반납해 다른 학생이 쓸 수 있게 한다. */
export async function deactivateStudent(id: number) {
  await requireTeacher();
  const conn = db();
  conn.transaction(() => {
    conn.prepare('UPDATE students SET active = 0, pin_lookup = NULL WHERE id = ?').run(id);
    conn.prepare('DELETE FROM enrollments WHERE student_id = ?').run(id);
  })();
  revalidatePath('/admin', 'layout');
}
