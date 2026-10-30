'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: '오늘 출결' },
  { href: '/admin/courses', label: '강의' },
  { href: '/admin/students', label: '학생' },
  { href: '/admin/records', label: '기록' },
];

export function NavLinks() {
  const path = usePathname();
  return LINKS.map(l => (
    <Link key={l.href} href={l.href}
      aria-current={(l.href === '/admin' ? path === l.href : path.startsWith(l.href)) ? 'page' : undefined}>
      {l.label}
    </Link>
  ));
}
