'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Corners } from '@/components/Corners';
import type { Course } from '@/lib/repo';
import { DAYS } from '@/lib/time';
import { deleteCourse, saveCourse } from './actions';

type Props = {
  courses: (Course & { count: number })[];
  teachers: { id: number; name: string; title: string }[];
  roster: { id: number; name: string; grade: string; courses: number }[];
  course: Course | null;
  enrolled: number[];
  warnings: string[];
  saved: boolean;
};

const LATE_OPTIONS = [[0, '시작 시각 이후'], [5, '5분 이후'], [10, '10분 이후']] as const;

export function CourseEditor({ courses, teachers, roster, course, enrolled, warnings, saved }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [name, setName] = useState(course?.name ?? '');
  const [teacherId, setTeacherId] = useState<number | null>(course ? course.teacherId : teachers[0]?.id ?? null);
  const [room, setRoom] = useState(course?.room ?? '');
  const [days, setDays] = useState<string[]>(course?.days ?? []);
  const [startT, setStartT] = useState(course?.start ?? '16:00');
  const [endT, setEndT] = useState(course?.end ?? '17:50');
  const [late, setLate] = useState<number>(course?.lateThresholdMin ?? 0);
  const [picked, setPicked] = useState<Set<number>>(new Set(enrolled));
  const [q, setQ] = useState('');

  const visible = useMemo(() => {
    const t = q.trim();
    // 선택된 학생을 위로. 체크할 때마다 줄이 튀지 않도록 picked는 의존성에서 일부러 뺐다.
    return roster.filter(s => !t || s.name.includes(t) || s.grade.includes(t))
      .sort((a, b) => Number(picked.has(b.id)) - Number(picked.has(a.id)));
  }, [roster, q]);

  const toggleDay = (d: string) => setDays(ds => (ds.includes(d) ? ds.filter(x => x !== d) : [...ds, d]));
  const toggleStudent = (id: number) => setPicked(p => {
    const n = new Set(p);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const save = () => start(async () => {
    setError('');
    const res = await saveCourse({
      id: course?.id ?? null, name, teacherId, room, days, start: startT, end: endT,
      lateThresholdMin: late, studentIds: [...picked],
    });
    if (!res.ok) return setError(res.error);
    router.replace(`/admin/courses?id=${res.id}&saved=1`);
    router.refresh();
  });

  const remove = () => {
    if (!course || !confirm(`'${course.name}' 강의를 삭제할까요? 수강 학생 배정도 함께 지워집니다. 지난 출결 기록은 남아요.`)) return;
    start(async () => {
      await deleteCourse(course.id);
      router.replace('/admin/courses');
      router.refresh();
    });
  };

  const daySummary = DAYS.filter(d => days.includes(d)).join('·') || '요일 미정';

  return (
    <div className="with-aside-left">
      <aside style={{ padding: '22px 0' }}>
        <div className="side-list-head">
          <h4>강의 {courses.length}</h4>
          <Link className="btn btn-secondary" href="/admin/courses?id=new" style={{ gap: 4 }}>
            <Plus size={16} strokeWidth={1.5} />새 강의
          </Link>
        </div>
        {courses.map(c => (
          <Link key={c.id} href={`/admin/courses?id=${c.id}`} className="side-item" aria-current={c.id === course?.id}>
            <div className="t">{c.name}</div>
            <div className="s">{c.days.join('·')} {c.start}–{c.end} · {c.count}명</div>
          </Link>
        ))}
        {!course && <div className="side-item" aria-current><div className="t">{name || '새 강의'}</div><div className="s">작성 중</div></div>}
      </aside>

      <div style={{ padding: '24px 30px 30px' }}>
        <div className="page-head">
          <h2>{course ? '강의 편집' : '새 강의'}</h2>
          <div className="actions">
            {course && <button className="btn btn-ghost" onClick={remove} disabled={pending}>강의 삭제</button>}
            <button className="btn btn-primary" style={{ padding: '8px 20px' }} onClick={save} disabled={pending}>저장</button>
          </div>
        </div>

        {(error || saved || warnings.length > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {error && <div className="notice" role="alert">{error}</div>}
            {saved && !error && <div className="notice">저장했어요.</div>}
            {warnings.map(w => <div key={w} className="notice">시간 겹침 · {w}</div>)}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 34, marginTop: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field"><label htmlFor="c-name">강의명</label>
              <input id="c-name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="예: 중2 수학 A반" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field"><label htmlFor="c-teacher">담당 강사</label>
                <select id="c-teacher" className="input" value={teacherId ?? ''} onChange={e => setTeacherId(Number(e.target.value) || null)}>
                  <option value="">미정</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="c-room">강의실</label>
                <input id="c-room" className="input" value={room} onChange={e => setRoom(e.target.value)} placeholder="예: 301호" />
              </div>
            </div>
            <div className="field"><label>요일</label>
              <div className="day-grid">
                {DAYS.map(d => <button key={d} type="button" aria-pressed={days.includes(d)} onClick={() => toggleDay(d)}>{d}</button>)}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field"><label htmlFor="c-start">시작 시간</label>
                <input id="c-start" className="input" type="time" value={startT} onChange={e => setStartT(e.target.value)} />
              </div>
              <div className="field"><label htmlFor="c-end">종료 시간</label>
                <input id="c-end" className="input" type="time" value={endT} onChange={e => setEndT(e.target.value)} />
              </div>
            </div>
            <div className="field"><label>지각 기준</label>
              <div className="seg">
                {LATE_OPTIONS.map(([v, l]) => <button key={v} type="button" aria-pressed={late === v} onClick={() => setLate(v)}>{l}</button>)}
              </div>
            </div>
            <div className="blueprint" style={{ padding: '14px 16px', fontSize: 13, color: 'var(--color-neutral-800)' }}>
              <Corners />
              매주 {daySummary} {startT}–{endT}{room && ` · ${room}`} · 학생 {picked.size}명
            </div>
          </div>

          <div className="field" style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="c-q">참여 학생 · {picked.size}명 선택</label>
            <input id="c-q" className="input" placeholder="이름 또는 학년으로 찾기" value={q} onChange={e => setQ(e.target.value)} />
            <div className="check-list">
              {visible.map(s => (
                <label key={s.id}>
                  <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggleStudent(s.id)} />
                  <span style={{ flex: 1 }}>{s.name}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{s.grade} · 수강 {s.courses}개</span>
                </label>
              ))}
              {!visible.length && <div className="empty">학생이 없어요.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
