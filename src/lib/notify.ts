import { db } from './db';
import type { NotifyChannel, Student } from './repo';

/**
 * 학부모 알림 발송. 지금은 실제 발송 업체(카카오 알림톡/문자)를 연결하지 않아 콘솔에 남기고 'sent'로 기록한다.
 * 연동할 때는 send()만 바꾸면 된다. 알림톡이 실패하면 문자로 대체한다.
 */
async function send(channel: Exclude<NotifyChannel, 'off'>, phone: string, text: string): Promise<boolean> {
  console.log(`[notify:${channel}] ${phone} ${text}`);
  return true;
}

export async function notifyParent(student: Student, attendanceId: number, type: 'in' | 'out', time: string) {
  const insert = db().prepare('INSERT INTO notifications (attendance_id, type, channel, status, sent_at) VALUES (?, ?, ?, ?, ?)');
  if (student.notifyChannel === 'off' || !student.parentPhone) {
    insert.run(attendanceId, type, student.notifyChannel, 'skipped', time);
    return false;
  }
  const text = `[새봄학원] ${student.name} 학생이 ${time}에 ${type === 'in' ? '등원' : '하원'}했습니다.`;
  let channel = student.notifyChannel;
  let ok = await send(channel, student.parentPhone, text).catch(() => false);
  if (!ok && channel === 'kakao') {
    channel = 'sms';
    ok = await send(channel, student.parentPhone, text).catch(() => false);
  }
  insert.run(attendanceId, type, channel, ok ? 'sent' : 'failed', time);
  return ok;
}
