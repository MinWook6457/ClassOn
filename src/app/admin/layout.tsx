import { requireTeacher } from '@/lib/auth';
import { ACADEMY_NAME } from '@/lib/config';
import { logout } from '../login/actions';
import { NavLinks } from './NavLinks';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const teacher = await requireTeacher();
  return (
    <>
      <nav className="nav admin-nav">
        <span className="nav-brand">{ACADEMY_NAME} 출결</span>
        <NavLinks />
        <span className="who">
          {teacher.name} {teacher.title}
          <form action={logout}><button className="btn btn-ghost" style={{ fontSize: 13 }}>로그아웃</button></form>
        </span>
      </nav>
      {children}
    </>
  );
}
