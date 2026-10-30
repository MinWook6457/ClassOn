import { requireTeacher } from '@/lib/auth';
import { parseFilter, queryRecords, recordStats } from '@/lib/records';
import { listCourses, listStudents } from '@/lib/repo';
import { RecordsClient } from './RecordsClient';

const PAGE_SIZE = 20;

export default async function RecordsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireTeacher();
  const sp = await searchParams;
  const filter = parseFilter(sp);
  const rows = queryRecords(filter);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(sp.page) || 1));
  const student = filter.studentId ? listStudents().find(s => s.id === filter.studentId) : undefined;

  return (
    <RecordsClient
      filter={filter}
      studentName={student?.name ?? null}
      courses={listCourses().map(c => ({ id: c.id, name: c.name }))}
      stats={recordStats(rows)}
      rows={rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
      total={rows.length}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}
