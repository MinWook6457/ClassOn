import { requireTeacher } from '@/lib/auth';
import { enrollmentMap, listCourses, listStudents, listTeachers, overlapWarnings } from '@/lib/repo';
import { CourseEditor } from './CourseEditor';

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ id?: string; saved?: string }> }) {
  await requireTeacher();
  const { id, saved } = await searchParams;
  const courses = listCourses();
  const enroll = enrollmentMap();
  const students = listStudents();
  const courseCount = new Map<number, number>();
  for (const ids of enroll.values()) for (const sid of ids) courseCount.set(sid, (courseCount.get(sid) ?? 0) + 1);

  const selectedId = id === 'new' ? null : Number(id) || courses[0]?.id || null;
  const selected = courses.find(c => c.id === selectedId) ?? null;

  return (
    <CourseEditor
      key={selected?.id ?? 'new'}
      courses={courses.map(c => ({ ...c, count: enroll.get(c.id)?.length ?? 0 }))}
      teachers={listTeachers()}
      roster={students.map(s => ({ id: s.id, name: s.name, grade: s.grade, courses: courseCount.get(s.id) ?? 0 }))}
      course={selected}
      enrolled={selected ? enroll.get(selected.id) ?? [] : []}
      warnings={selected ? overlapWarnings(selected.id) : []}
      saved={saved === '1'}
    />
  );
}
