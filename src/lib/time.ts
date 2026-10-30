// 학원은 한국에 있으므로 모든 날짜·시각 판단은 KST 기준으로 한다.
export const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;
export type Day = (typeof DAYS)[number];

const TZ = 'Asia/Seoul';
const JS_DAY_TO_KO: Day[] = ['일', '월', '화', '수', '목', '금', '토'];

export type KstNow = { date: string; time: string; minutes: number; dow: Day };

function parts(d: Date) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** 현재 KST 시각. DEMO_NOW=2026-10-30T16:05 로 고정할 수 있다(시연용). */
export function nowKst(): KstNow {
  const demo = process.env.DEMO_NOW;
  const { date, time } = demo ? { date: demo.slice(0, 10), time: demo.slice(11, 16) } : parts(new Date());
  return { date, time, minutes: toMin(time), dow: dowOf(date) };
}

export function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function fromMin(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' → 요일 */
export function dowOf(date: string): Day {
  const [y, m, d] = date.split('-').map(Number);
  return JS_DAY_TO_KO[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function startOfWeek(date: string): string {
  return addDays(date, -DAYS.indexOf(dowOf(date)));
}

export function startOfMonth(date: string): string {
  return date.slice(0, 8) + '01';
}

/** 2026년 10월 30일 금요일 */
export function longDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일 ${dowOf(date)}요일`;
}

/** 10.30 금 */
export function shortDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}.${String(d).padStart(2, '0')} ${dowOf(date)}`;
}

/** 분 → '1:52' */
export function hm(min: number): string {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

/** 분 → '1시간 52분' */
export function hmKo(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}시간 ${m}분` : `${m}분`;
}

export function sortDays(days: string[]): Day[] {
  return DAYS.filter(d => days.includes(d));
}
