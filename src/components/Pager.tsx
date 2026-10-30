'use client';

/** '128건 중 1–20' + 페이지 번호. 현재 페이지 앞뒤 2쪽과 처음·끝만 보인다. */
export function Pager({ total, page, size, onPage }: {
  total: number; page: number; size: number; onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total <= size) return null;
  const nums = [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pages])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  return (
    <div className="pager">
      <span>{total.toLocaleString()}건 중 {((page - 1) * size + 1).toLocaleString()}–{Math.min(page * size, total).toLocaleString()}</span>
      <span className="pages">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="이전 페이지">‹</button>
        {nums.map((n, i) => (
          <span key={n} style={{ display: 'contents' }}>
            {i > 0 && n - nums[i - 1] > 1 && <span>…</span>}
            <button onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined}>{n}</button>
          </span>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="다음 페이지">›</button>
      </span>
    </div>
  );
}
