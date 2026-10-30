import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
import { signSession, verifySession } from './crypto';

const COOKIE = 'session';
const TTL_MS = 1000 * 60 * 60 * 12;

export type Teacher = { id: number; name: string; title: string; email: string };

export async function currentTeacher(): Promise<Teacher | null> {
  const id = verifySession((await cookies()).get(COOKIE)?.value);
  if (id == null) return null;
  return (db().prepare('SELECT id, name, title, email FROM teachers WHERE id = ?').get(id) as Teacher) ?? null;
}

/** 관리자 화면·액션 진입점에서 호출. 로그인이 안 되어 있으면 /login 으로 보낸다. */
export async function requireTeacher(): Promise<Teacher> {
  const t = await currentTeacher();
  if (!t) redirect('/login');
  return t;
}

export async function startSession(teacherId: number) {
  (await cookies()).set(COOKIE, signSession(teacherId, TTL_MS), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: TTL_MS / 1000,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}
