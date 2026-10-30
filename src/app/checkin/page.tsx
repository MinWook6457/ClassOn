import type { Metadata } from 'next';
import { ACADEMY_NAME } from '@/lib/config';
import { CheckinClient } from './CheckinClient';

export const metadata: Metadata = { title: `${ACADEMY_NAME} 등원·하원` };

export default function CheckinPage() {
  return <CheckinClient academy={ACADEMY_NAME} />;
}
