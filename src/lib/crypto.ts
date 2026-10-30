import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './db';

let cached: string | undefined;

/** APP_SECRET 환경변수가 없으면 data/.secret 에 한 번 만들어 둔다. 바뀌면 PIN 복호화가 불가능해진다. */
function secret(): string {
  if (cached) return cached;
  if (process.env.APP_SECRET) return (cached = process.env.APP_SECRET);
  const file = path.join(DATA_DIR, '.secret');
  if (!fs.existsSync(file)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'));
  }
  return (cached = fs.readFileSync(file, 'utf8').trim());
}

function hmac(purpose: string, value: string): string {
  return crypto.createHmac('sha256', secret()).update(`${purpose}:${value}`).digest('hex');
}

// — PIN: 조회는 HMAC으로, 'PIN 보기'는 암호문 복호화로 —

export const pinLookup = (pin: string) => hmac('pin', pin);

function encKey() {
  return crypto.createHash('sha256').update(`enc:${secret()}`).digest();
}

export function encryptPin(pin: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const body = Buffer.concat([c.update(pin, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), body].map(b => b.toString('base64')).join('.');
}

export function decryptPin(enc: string): string {
  const [iv, tag, body] = enc.split('.').map(s => Buffer.from(s, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', encKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString('utf8');
}

export function randomPin(): string {
  return String(crypto.randomInt(0, 10000)).padStart(4, '0');
}

// — 선생님 비밀번호 —

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16);
  return `${salt.toString('hex')}:${crypto.scryptSync(pw, salt, 32).toString('hex')}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const actual = crypto.scryptSync(pw, Buffer.from(salt, 'hex'), 32);
  return crypto.timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}

// — 세션 토큰: teacherId.expires.signature —

export function signSession(teacherId: number, ttlMs: number): string {
  const payload = `${teacherId}.${Date.now() + ttlMs}`;
  return `${payload}.${hmac('session', payload)}`;
}

export function verifySession(token: string | undefined): number | null {
  if (!token) return null;
  const [id, exp, sig] = token.split('.');
  if (!id || !exp || !sig) return null;
  const expected = hmac('session', `${id}.${exp}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now()) return null;
  return Number(id);
}
