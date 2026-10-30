'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Corners } from '@/components/Corners';
import { Pager } from '@/components/Pager';
import { longDate } from '@/lib/time';
import type { CourseBoard, TodayRow, TodaySnapshot } from '@/lib/today';

const POLL_MS = 10_000;
const PAGE_SIZE = 20;

type Filter = 'all' | 'in' | 'out' | 'none' | 'late';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: '전체' }, { id: 'in', label: '재원 중' }, { id: 'out', label: '하원' },
  { id: 'none', label: '미등원' }, { id: 'late', label: '지각' },
];
const matches = (r: TodayRow, f: Filter) => f === 'all' || (f === 'late' ? r.lateMin > 0 : r.state === f);

const STATE_TAG = { in: ['재원 중', 'tag-accent'], out: ['하원', 'tag-neutral'], none: ['미등원', 'tag-outline'] } as const;
const PHASE_TAG = { upcoming: ['예정', 'tag-outline'], live: ['수업 중', 'tag-accent'], done: ['종료', 'tag-neutral'] } as const;

export function DashboardClient({ snap }: { snap: TodaySnapshot }) {
  const router = useRouter();
  const [tab, setTab] = useState<'list' | 'board'>('list');

  // 새 출결을 10초마다 반영
  useEffect(() => {
    const t = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div>
      <div className="page" style={{ paddingBottom: 0 }}>
        <div className="page-head" style={{ alignItems: 'baseline' }}>
          <h2>오늘 출결</h2>
          <span className="muted" style={{ fontSize: 14 }}>{longDate(snap.date)} · {snap.time} 기준</span>
        </div>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'list'} onClick={() => setTab('list')}>학생 목록</button>
          <button role="tab" aria-selected={tab === 'board'} onClick={() => setTab('board')}>강의별 보기</button>
        </div>
      </div>
      {tab === 'list' ? <ListView rows={snap.rows} /> : <BoardView snap={snap} />}
    </div>
  );
}

function ListView({ rows }: { rows: TodayRow[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const count = (f: Filter) => rows.filter(r => matches(r, f)).length;
  const shown = useMemo(
    () => rows.filter(r => matches(r, filter) && (!q || r.name.includes(q.trim()))),
    [rows, filter, q],
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [filter, q]);

  return (
    <div className="page" style={{ paddingTop: 20 }}>
      <div className="stat-grid" style={{ marginTop: 0 }}>
        {[['오늘 수강 예정', rows.length], ['재원 중', count('in')], ['하원', count('out')], ['미등원', count('none')], ['지각', count('late')]]
          .map(([label, value]) => (
            <div key={label}>
              <div className="stat-label">{label}</div>
              <div className="stat-value">{value}<small> 명</small></div>
            </div>
          ))}
      </div>

      <div className="toolbar">
        <div className="search" style={{ width: 260 }}>
          <Search size={18} strokeWidth={1.5} />
          <input className="input" placeholder="학생 이름 검색" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="seg">
          {FILTERS.map(f => (
            <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label} {count(f.id)}</button>
          ))}
        </div>
        <span className="muted" style={{ marginLeft: 'auto', fontSize: 13 }}>{rows.length}명 중 {shown.length}명 표시</span>
      </div>

      <table className="table" style={{ marginTop: 14 }}>
        <thead><tr><th>이름</th><th>학년</th><th>강의</th><th>시작</th><th>등원</th><th>하원</th><th>상태</th><th>학부모 알림</th></tr></thead>
        <tbody>
          {pageRows.map(r => (
            <tr key={r.studentId}>
              <td style={{ fontWeight: 500 }}>{r.name}</td>
              <td>{r.grade}</td>
              <td>{r.course}</td>
              <td className="muted num">{r.start}</td>
              <td className="num">{r.inT ?? '—'}</td>
              <td className="num">{r.outT ?? '—'}</td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className={`tag ${STATE_TAG[r.state][1]}`}>{STATE_TAG[r.state][0]}</span>
                  {r.lateMin > 0 && <span className="tag tag-outline">{r.lateMin}분 지각</span>}
                  {r.earlyMin > 0 && <span className="tag tag-outline">{r.earlyMin}분 일찍</span>}
                  {r.needsReview && <span className="tag tag-outline">확인 필요</span>}
                </div>
              </td>
              <td className="muted" style={{ fontSize: 13 }}>{r.notify}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!shown.length && <div className="empty">{rows.length ? '조건에 맞는 학생이 없어요.' : '오늘 예정된 수업이 없어요.'}</div>}
      <Pager total={shown.length} page={page} size={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}

function BoardView({ snap }: { snap: TodaySnapshot }) {
  const inNow = snap.rows.filter(r => r.state === 'in').length;
  return (
    <div className="with-aside-right" style={{ minHeight: 0 }}>
      <div className="page">
        <div className="page-head" style={{ alignItems: 'baseline' }}>
          <h3 style={{ margin: 0 }}>오늘 강의 {snap.boards.length}개</h3>
          <span className="muted" style={{ fontSize: 14 }}>재원 중 {inNow}명</span>
        </div>
        {snap.boards.length
          ? <div className="board-grid">{snap.boards.map(b => <Board key={b.id} b={b} />)}</div>
          : <div className="empty">오늘 예정된 강의가 없어요.</div>}
      </div>
      <aside style={{ padding: '26px 22px' }}>
        <h4 style={{ margin: '0 0 12px' }}>실시간 기록</h4>
        {snap.logs.map((l, i) => (
          <div key={i} className="log-row">
            <span className="muted num">{l.t}</span>
            <div>
              <div><b style={{ fontWeight: 500 }}>{l.name}</b> {l.act}</div>
              <div className="muted" style={{ fontSize: 12 }}>{l.sub}</div>
            </div>
          </div>
        ))}
        {!snap.logs.length && <div className="muted" style={{ fontSize: 13 }}>아직 기록이 없어요.</div>}
      </aside>
    </div>
  );
}

function Board({ b }: { b: CourseBoard }) {
  const arrived = b.students.filter(s => s.state !== 'none').length;
  const pct = b.students.length ? Math.round((arrived / b.students.length) * 100) : 0;
  return (
    <div className="blueprint board">
      <Corners />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, color: 'var(--color-accent-700)' }}>{b.time}{b.room && ` · ${b.room}`}</span>
        <span className={`tag ${PHASE_TAG[b.phase][1]}`}>{PHASE_TAG[b.phase][0]}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 21, lineHeight: 1.1 }}>{b.name}</div>
      <div className="muted" style={{ fontSize: 12 }}>{b.teacher && `${b.teacher} 선생님 · `}등원 {arrived}/{b.students.length}</div>
      <div className="bar"><div style={{ width: `${pct}%` }} /></div>
      <div>
        {b.students.map((s, i) => (
          <div key={i} className="board-row">
            <span className={`dot${s.state === 'in' ? ' on' : ''}`} />
            <span style={{ flex: 1 }}>{s.name}</span>
            <span className="muted num">{s.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
