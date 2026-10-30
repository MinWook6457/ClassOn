'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Corners } from '@/components/Corners';
import { Pager } from '@/components/Pager';
import { CHANNEL_LABEL, type NotifyChannel } from '@/lib/labels';
import type { Student } from '@/lib/repo';
import {
  createStudent, deactivateStudent, reissuePin, revealStudentPin, setNotifyChannel, updateStudent, type StudentInput,
} from './actions';

type Row = Student & { courses: string[] };
const PAGE_SIZE = 20;
const CHANNELS: [NotifyChannel, string][] = [['kakao', '카카오 알림톡'], ['sms', '문자'], ['off', '끔']];

export function StudentsClient({ rows, selected, month }: {
  rows: Row[]; selected: Row | null; month: { attended: number; scheduled: number } | null;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null);
  const [issued, setIssued] = useState<{ id: number; pin: string } | null>(null);

  const shown = useMemo(() => {
    const t = q.trim();
    return rows.filter(r => !t || r.name.includes(t) || r.grade.includes(t));
  }, [rows, q]);
  useEffect(() => setPage(1), [q]);

  const select = (id: number) => router.replace(`/admin/students?id=${id}`, { scroll: false });

  return (
    <div className="with-aside-right" style={{ '--aside': '340px' } as React.CSSProperties}>
      <div className="page" style={{ paddingTop: 24 }}>
        <div className="page-head">
          <h2>학생</h2>
          <span className="muted" style={{ fontSize: 14 }}>{rows.length}명</span>
          <div className="actions">
            <div className="search" style={{ width: 220 }}>
              <Search size={18} strokeWidth={1.5} />
              <input className="input" placeholder="이름·학년 검색" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <button className="btn btn-primary" style={{ gap: 4 }} onClick={() => setDialog('create')}>
              <Plus size={16} strokeWidth={1.5} />학생 등록
            </button>
          </div>
        </div>
        <table className="table" style={{ marginTop: 18 }}>
          <thead><tr><th>이름</th><th>학년</th><th>수강 강의</th><th>PIN</th><th>학부모 연락처</th><th>알림</th></tr></thead>
          <tbody>
            {shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(s => (
              <tr key={s.id} className={`clickable${s.id === selected?.id ? ' selected' : ''}`} onClick={() => select(s.id)}>
                <td style={{ fontWeight: 500 }}>{s.name}</td>
                <td>{s.grade}</td>
                <td>{s.courses.join(', ') || <span className="muted">—</span>}</td>
                <td className="muted" style={{ letterSpacing: '.2em' }}>••••</td>
                <td className="num">{s.parentPhone || '—'}</td>
                <td><span className={`tag ${s.notifyChannel === 'off' ? 'tag-outline' : 'tag-neutral'}`}>{CHANNEL_LABEL[s.notifyChannel]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <div className="empty">{rows.length ? '검색 결과가 없어요.' : '등록된 학생이 없어요.'}</div>}
        <Pager total={shown.length} page={page} size={PAGE_SIZE} onPage={setPage} />
      </div>

      <aside style={{ padding: '24px 24px 30px' }}>
        {selected
          ? <Detail key={selected.id} s={selected} month={month} onEdit={() => setDialog('edit')}
              issuedPin={issued?.id === selected.id ? issued.pin : null} />
          : <div className="muted" style={{ fontSize: 14 }}>학생을 등록하면 여기에서 PIN을 확인할 수 있어요.</div>}
      </aside>

      {dialog && (
        <StudentDialog
          initial={dialog === 'edit' ? selected : null}
          onClose={() => setDialog(null)}
          onCreated={(id, pin) => { setIssued({ id, pin }); setDialog(null); select(id); }}
          onSaved={() => { setDialog(null); router.refresh(); }}
          onDeactivated={() => { setDialog(null); router.replace('/admin/students'); }}
        />
      )}
    </div>
  );
}

function Detail({ s, month, onEdit, issuedPin }: {
  s: Row; month: { attended: number; scheduled: number } | null; onEdit: () => void; issuedPin: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pin, setPin] = useState<string | null>(issuedPin);
  const [reveal, setReveal] = useState(!!issuedPin);
  const [reissued, setReissued] = useState(!!issuedPin);
  const [channel, setChannel] = useState(s.notifyChannel);

  const toggleReveal = () => start(async () => {
    if (!reveal && !pin) setPin(await revealStudentPin(s.id));
    setReveal(r => !r);
  });
  const reissue = () => {
    if (!confirm(`${s.name} 학생의 PIN을 새로 발급할까요? 이전 PIN은 바로 쓸 수 없게 돼요.`)) return;
    start(async () => {
      setPin(await reissuePin(s.id));
      setReveal(true);
      setReissued(true);
    });
  };
  const changeChannel = (c: NotifyChannel) => start(async () => {
    setChannel(c);
    await setNotifyChannel(s.id, c);
    router.refresh();
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-accent-700)' }}>{s.grade} · {s.courses.join(', ') || '수강 강의 없음'}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h3 style={{ margin: '2px 0 0' }}>{s.name}</h3>
          <button className="btn btn-ghost" onClick={onEdit} style={{ fontSize: 13 }}>정보 수정</button>
        </div>
      </div>

      <div className="blueprint" style={{ padding: 18 }}>
        <Corners />
        <div className="muted" style={{ fontSize: 12 }}>출결 비밀번호</div>
        <div className="pin-cells">
          {[0, 1, 2, 3].map(i => <div key={i}>{reveal && pin ? pin[i] : '•'}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          <button className="btn btn-secondary" onClick={toggleReveal} disabled={pending}>{reveal ? 'PIN 숨기기' : 'PIN 보기'}</button>
          <button className="btn btn-primary" onClick={reissue} disabled={pending}>PIN 재발급</button>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 10, textWrap: 'pretty' }}>
          {reissued
            ? '새 PIN이 발급됐어요. 학생에게 전달해 주세요. 이전 PIN은 더 이상 쓸 수 없어요.'
            : 'PIN은 다른 학생과 겹치지 않게 자동으로 만들어져요.'}
        </div>
      </div>

      <div className="info-rows">
        <div><span>학부모 연락처</span><span className="num">{s.parentPhone || '—'}</span></div>
        <div>
          <span>등·하원 알림</span>
          <div className="seg">
            {CHANNELS.map(([c, l]) => <button key={c} aria-pressed={channel === c} onClick={() => changeChannel(c)} disabled={pending}>{l}</button>)}
          </div>
        </div>
        <div><span>이번 달 출석</span><span>{month ? `${month.attended}/${month.scheduled}일` : '—'}</span></div>
      </div>
      <Link className="btn btn-ghost" href={`/admin/records?student=${s.id}`} style={{ alignSelf: 'flex-start' }}>출결 기록 보기 →</Link>
    </div>
  );
}

function StudentDialog({ initial, onClose, onCreated, onSaved, onDeactivated }: {
  initial: Row | null;
  onClose: () => void;
  onCreated: (id: number, pin: string) => void;
  onSaved: () => void;
  onDeactivated: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [v, setV] = useState<StudentInput>({
    name: initial?.name ?? '', grade: initial?.grade ?? '', parentPhone: initial?.parentPhone ?? '',
    notifyChannel: initial?.notifyChannel ?? 'kakao',
  });
  const set = (k: keyof StudentInput) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      if (initial) {
        const r = await updateStudent(initial.id, v);
        if (!r.ok) return setError(r.error);
        onSaved();
      } else {
        const r = await createStudent(v);
        if (!r.ok) return setError(r.error);
        onCreated(r.id, r.pin);
      }
    });
  };
  const deactivate = () => {
    if (!initial || !confirm(`${initial.name} 학생을 퇴원 처리할까요? 지난 출결 기록은 남고, 강의 배정과 PIN은 해제돼요.`)) return;
    start(async () => { await deactivateStudent(initial.id); onDeactivated(); });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="dialog" role="dialog" aria-modal aria-labelledby="sd-title" onSubmit={submit} style={{ background: 'var(--color-bg)' }}>
        <div id="sd-title" className="dialog-title">{initial ? '학생 정보 수정' : '학생 등록'}</div>
        <div className="form-grid">
          <div className="row2">
            <div className="field"><label htmlFor="sd-name">이름</label><input id="sd-name" className="input" value={v.name} onChange={set('name')} autoFocus /></div>
            <div className="field"><label htmlFor="sd-grade">학년</label><input id="sd-grade" className="input" value={v.grade} onChange={set('grade')} placeholder="예: 중2" /></div>
          </div>
          <div className="field"><label htmlFor="sd-phone">학부모 연락처</label>
            <input id="sd-phone" className="input" value={v.parentPhone} onChange={set('parentPhone')} placeholder="010-0000-0000" inputMode="tel" />
          </div>
          <div className="field"><label>등·하원 알림</label>
            <div className="seg">
              {CHANNELS.map(([c, l]) => (
                <button key={c} type="button" aria-pressed={v.notifyChannel === c} onClick={() => setV({ ...v, notifyChannel: c })}>{l}</button>
              ))}
            </div>
          </div>
          {!initial && <div className="muted" style={{ fontSize: 12 }}>등록하면 출결 PIN 4자리가 자동으로 발급돼요.</div>}
          {error && <div className="error-text" role="alert">{error}</div>}
        </div>
        <div className="dialog-actions" style={{ alignItems: 'center' }}>
          {initial && <button type="button" className="btn btn-ghost" onClick={deactivate} disabled={pending} style={{ marginRight: 'auto' }}>퇴원 처리</button>}
          <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" disabled={pending}>{initial ? '저장' : '등록'}</button>
        </div>
      </form>
    </div>
  );
}
