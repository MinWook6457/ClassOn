'use client';

import { Bell, Check, ChevronLeft, Delete, LogIn, LogOut } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Corners } from '@/components/Corners';
import type { CheckinMode, CheckinResult } from '@/lib/checkin';

type Success = Extract<CheckinResult, { ok: true }>;

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clr', '0', 'del'] as const;
const SUBMIT_DELAY_MS = 220;
const RESULT_TIMEOUT_MS = 8000;

function useKstClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return { date: '', time: '' };
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', ...o }).format(now);
  return {
    date: fmt({ month: 'long', day: 'numeric', weekday: 'long' }),
    time: fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
  };
}

export function CheckinClient({ academy }: { academy: string }) {
  const clock = useKstClock();
  const [mode, setMode] = useState<CheckinMode | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<Success | null>(null);
  const [busy, setBusy] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);

  const reset = useCallback(() => {
    setMode(null); setPin(''); setError(''); setResult(null);
  }, []);

  const submit = useCallback(async (value: string, m: CheckinMode) => {
    setBusy(true);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: value, mode: m }),
      });
      const data = await res.json() as CheckinResult;
      if (data.ok) setResult(data);
      else {
        setError(data.error);
        if (data.locked) setLockedUntil(Date.now() + data.locked * 1000);
      }
    } catch {
      setError('연결이 원활하지 않아요. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      setPin('');
      setBusy(false);
    }
  }, []);

  const press = useCallback((key: (typeof KEYS)[number]) => {
    if (!mode || result || busy || Date.now() < lockedUntil) return;
    if (key === 'del') return setPin(pin.slice(0, -1));
    if (key === 'clr') return setPin('');
    if (pin.length >= 4) return;
    setError('');
    const next = pin + key;
    setPin(next);
    if (next.length === 4) {
      setBusy(true);
      setTimeout(() => submit(next, mode), SUBMIT_DELAY_MS);
    }
  }, [mode, result, busy, lockedUntil, submit, pin]);

  // 결과 화면은 일정 시간 뒤 처음으로 돌아간다.
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(reset, RESULT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [result, reset]);

  // 잠금이 풀리면 안내 문구를 지운다.
  useEffect(() => {
    if (!lockedUntil) return;
    const t = setTimeout(() => { setLockedUntil(0); setError(''); }, lockedUntil - Date.now());
    return () => clearTimeout(t);
  }, [lockedUntil]);

  // 키보드가 있는 태블릿·PC에서도 입력할 수 있게
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key as (typeof KEYS)[number]);
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Escape') { if (result) reset(); else if (mode) { setMode(null); setPin(''); setError(''); } }
      else if (e.key === 'Enter' && result) reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, result, mode, reset]);

  const label = mode === 'out' ? '하원' : '등원';

  return (
    <main className="kiosk">
      <div className="kiosk-frame">
        {!mode && !result && (
          <>
            <div className="muted" style={{ fontSize: 13, marginTop: 24 }}>{academy} · {clock.date}</div>
            <div className="kiosk-clock num">{clock.time || ' '}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 'auto', marginBottom: 12, paddingTop: 40 }}>
              <button className="btn btn-primary blueprint mode-btn" onClick={() => setMode('in')}>
                <Corners /><LogIn size={28} strokeWidth={1.5} /><span>등원하기</span>
              </button>
              <button className="btn btn-secondary blueprint mode-btn" onClick={() => setMode('out')}>
                <Corners /><LogOut size={28} strokeWidth={1.5} /><span>하원하기</span>
              </button>
            </div>
          </>
        )}

        {mode && !result && (
          <>
            <button className="btn btn-ghost" onClick={() => { setMode(null); setPin(''); setError(''); }}
              style={{ alignSelf: 'flex-start', fontSize: 15, paddingLeft: 0 }}>
              <ChevronLeft size={20} strokeWidth={1.5} />처음으로
            </button>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 34, marginTop: 22 }}>{label}</div>
            <div className="muted" style={{ fontSize: 15 }}>내 비밀번호 4자리</div>
            <div className="pin-boxes" aria-label={`${pin.length}자리 입력됨`}>
              {[0, 1, 2, 3].map(i => <div key={i}>{i < pin.length ? '●' : ''}</div>)}
            </div>
            <div className="error-text" role="alert" style={{ minHeight: 36, marginTop: 10 }}>{error}</div>
            <div className="keypad" style={{ paddingTop: 20 }}>
              {KEYS.map(k => (
                <button key={k} className="btn btn-secondary" onClick={() => press(k)}
                  disabled={Date.now() < lockedUntil}
                  aria-label={k === 'del' ? '한 자리 지우기' : k === 'clr' ? '전체 지움' : k}>
                  {k === 'del' ? <Delete size={24} strokeWidth={1.5} /> : k === 'clr' ? <span className="clr">전체 지움</span> : k}
                </button>
              ))}
            </div>
          </>
        )}

        {result && (
          <>
            <div className="result-check"><Check size={30} strokeWidth={1.5} /></div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 40, lineHeight: 1.1, marginTop: 20 }}>
              {result.name}님,<br />{result.mode === 'in' ? '등원' : '하원'} 완료
            </div>
            <div className="result-grid">
              <div>
                <div className="k">{result.mode === 'in' ? '등원' : '하원'} 시각</div>
                <div className="v num">{result.time}</div>
              </div>
              <div>
                <div className="k">상태</div>
                <div className="v" style={{ color: result.flagged ? 'var(--color-accent-800)' : undefined }}>{result.label}</div>
              </div>
              {result.course && (
                <div className="wide">
                  <div className="k">오늘 수강 강의</div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>{result.course.name}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {result.course.time}{result.course.room && ` · ${result.course.room}`}{result.course.teacher && ` · ${result.course.teacher} 선생님`}
                  </div>
                </div>
              )}
            </div>
            <p style={{ margin: '22px 0 0', fontSize: 16, textWrap: 'pretty' }}>{result.cheer}</p>
            <div className="muted" style={{ marginTop: 'auto', paddingTop: 24, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              {result.notified && <><Bell size={16} strokeWidth={1.5} />학부모님께 {result.mode === 'in' ? '등원' : '하원'} 알림을 보냈어요</>}
            </div>
            <button className="btn btn-primary btn-block" onClick={reset} style={{ height: 52, fontSize: 17, marginTop: 12 }}>확인</button>
          </>
        )}
      </div>
    </main>
  );
}
