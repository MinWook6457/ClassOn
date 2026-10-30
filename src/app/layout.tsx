import type { Metadata, Viewport } from 'next';
import { ACADEMY_NAME } from '@/lib/config';
import './globals.css';
import './app.css';

export const metadata: Metadata = {
  title: `${ACADEMY_NAME} 출결`,
  description: '학원 등원·하원 출결 관리',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
