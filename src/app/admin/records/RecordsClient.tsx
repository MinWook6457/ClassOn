'use client';

import { Download, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Pager } from '@/components/Pager';
import type { Period, RecordFilter, RecordRow, RecordStats, RecordStatus } from '@/lib/records';
import { hm, hmKo, shortDate } from '@/lib/time';

const PERIODS: [Period, string][] = [['today', '오늘'], ['week', '이번 주'], ['month', '이번 달'], ['custom', '직접 선택']];
const STATUS_TAG: Record<RecordStatus, string> = {
  출석: 'tag-neutral', 지각: 'tag-outline', '조기 하원': 'tag-outline', '확인 필요': 'tag-outline', 미등원: 'tag-outline', 결석: 'tag-accent',
};

type Props = {
  filter: RecordFilter; studentName: string | null; courses: { id: number; name: string }[];
  stats: RecordStats; rows: RecordRow[]; total: number; page: number; pageSize: number;
};

export function RecordsClient({ filter, studentName, courses, stats, rows, total, page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(filter.q);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) if (v) next.set(k, v); else next.delete(k);
    if (!('page' in patch)) next.delete('page');
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  // 학생 검색은 입력이 멈추면 반영(입력값만 지켜본다)
  useEffect(() => {
    if (q === filter.q) return;
    const t = setTimeout(() => update({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [q]);

  const exportHref = (format: 'csv' | 'xlsx') => {
    const p = new URLSearchParams(params.toString());
    p.delete('page');
    p.set('format', format);
    return `/api/export?${p}`;
  };

  return (
    <div className="page" style={{ paddingTop: 24 }}>
      <div className="page-head">
        <h2>출결 기록</h2>
        <div className="actions">
          <a className="btn btn-secondary" href={exportHref('csv')} style={{ gap: 6 }}><Download size={16} strokeWidth={1.5} />CSV</a>
          <a className="btn btn-primary" href={exportHref('xlsx')} style={{ gap: 6 }}><Download size={16} strokeWidth={1.5} />엑셀로 내보내기</a>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 20, flexWrap: 'wrap' }}>
        <div className="field"><label>기간</label>
          <div className="seg">
            {PERIODS.map(([p, l]) => (
              <button key={p} aria-pressed={filter.period === p}
                onClick={() => update(p === 'custom' ? { period: p, from: filter.from, to: filter.to } : { period: p, from: null, to: null })}>{l}</button>
            ))}
          </div>
        </div>
        <div className="field"><label>날짜</label>
          {filter.period === 'custom' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="date" className="input" style={{ width: 150 }} value={filter.from} onChange={e => e.target.value && update({ from: e.target.value })} />
              <span>–</span>
              <input type="date" className="input" style={{ width: 150 }} value={filter.to} onChange={e => e.target.value && update({ to: e.target.value })} />
            </div>
          ) : (
            <div className="input" style={{ display: 'flex', alignItems: 'center', width: 220 }}>
              {filter.from.replaceAll('-', '.')}{filter.from !== filter.to && ` – ${filter.to.slice(5).replace('-', '.')}`}
            </div>
          )}
        </div>
        <div className="field" style={{ width: 200 }}><label htmlFor="r-course">강의</label>
          <select id="r-course" className="input" value={filter.courseId ?? ''} onChange={e => update({ course: e.target.value || null })}>
            <option value="">전체 강의</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ width: 200 }}><label htmlFor="r-q">학생</label>
          {studentName ? (
            <div className="input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {studentName}
              <button className="btn btn-ghost" style={{ padding: 2 }} aria-label="학생 필터 해제" onClick={() => update({ student: null })}><X size={14} strokeWidth={1.5} /></button>
            </div>
          ) : (
            <input id="r-q" className="input" placeholder="전체 학생" value={q} onChange={e => setQ(e.target.value)} />
          )}
        </div>
      </div>

      <div className="stat-grid" style={{ '--cols': 4, marginTop: 22 } as React.CSSProperties}>
        {[
          ['출석률', stats.rate == null ? '—' : `${(stats.rate * 100).toFixed(1)}%`],
          ['지각', `${stats.late}건`],
          ['결석', `${stats.absent}건`],
          ['평균 체류', stats.avgStayMin == null ? '—' : hmKo(stats.avgStayMin)],
        ].map(([label, value]) => (
          <div key={label} style={{ padding: '12px 16px' }}>
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ fontSize: 30, lineHeight: 1.15 }}>{value}</div>
          </div>
        ))}
      </div>

      <table className="table" style={{ marginTop: 18 }}>
        <thead><tr><th>날짜</th><th>학생</th><th>강의</th><th>등원</th><th>하원</th><th>체류</th><th>상태</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={`${r.date}:${r.studentId}`}>
              <td className="muted">{shortDate(r.date)}</td>
              <td style={{ fontWeight: 500 }}>{r.name}</td>
              <td>{r.course}</td>
              <td className="num">{r.inT ?? '—'}</td>
              <td className="num">{r.outT ?? '—'}</td>
              <td className="num">{r.stayMin == null ? '—' : hm(r.stayMin)}</td>
              <td><span className={`tag ${STATUS_TAG[r.status]}`}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="empty">조건에 맞는 기록이 없어요.</div>}
      <Pager total={total} page={page} size={pageSize} onPage={p => update({ page: String(p) })} />
    </div>
  );
}
