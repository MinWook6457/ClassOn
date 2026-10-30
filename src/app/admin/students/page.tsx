import { requireTeacher } from '@/lib/auth';
import { monthAttendance } from '@/lib/records';
import { enrollmentMap, listCourses, listStudents } from '@/lib/repo';
import { StudentsClient } from './StudentsClient';

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireTeacher();
  const { id } = await searchParams;
  const students = listStudents();
  const courseNames = new Map(listCourses().map(c => [c.id, c.name]));
  const byStudent = new Map<number, string[]>();
  for (const [cid, sids] of enrollmentMap()) {
    for (const sid of sids) byStudent.set(sid, [...(byStudent.get(sid) ?? []), courseNames.get(cid)!]);
  }
  const rows = students.map(s => ({ ...s, courses: byStudent.get(s.id) ?? [] }));
  const selected = rows.find(s => s.id === Number(id)) ?? rows[0] ?? null;

  return (
    <StudentsClient
      rows={rows}
      selected={selected}
      month={selected ? monthAttendance(selected.id) : null}
    />
  );
}
