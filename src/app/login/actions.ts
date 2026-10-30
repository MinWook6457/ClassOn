'use server';

import { redirect } from 'next/navigation';
import { endSession, startSession } from '@/lib/auth';
import { verifyPassword } from '@/lib/crypto';
import { db } from '@/lib/db';

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const t = db().prepare('SELECT id, password_hash FROM teachers WHERE email = ?').get(email) as
    { id: number; password_hash: string } | undefined;
  if (!t || !verifyPassword(password, t.password_hash)) return '이메일 또는 비밀번호가 맞지 않아요.';
  await startSession(t.id);
  redirect('/admin');
}

export async function logout() {
  await endSession();
  redirect('/login');
}
