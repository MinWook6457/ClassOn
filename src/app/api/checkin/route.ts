import { NextResponse, type NextRequest } from 'next/server';
import { checkin } from '@/lib/checkin';

// 학생 휴대폰에서 호출하는 공개 API. 인증 대신 PIN 연속 오류 잠금으로 보호한다.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { pin?: unknown; mode?: unknown } | null;
  const pin = typeof body?.pin === 'string' ? body.pin : '';
  const mode = body?.mode === 'out' ? 'out' : body?.mode === 'in' ? 'in' : null;
  if (!mode) return NextResponse.json({ ok: false, error: '등원 또는 하원을 먼저 골라 주세요.' }, { status: 400 });

  const clientKey = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
  return NextResponse.json(await checkin(pin, mode, clientKey));
}
