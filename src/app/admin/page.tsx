import { requireTeacher } from '@/lib/auth';
import { todaySnapshot } from '@/lib/today';
import { DashboardClient } from './DashboardClient';

export default async function TodayPage() {
  await requireTeacher();
  return <DashboardClient snap={todaySnapshot()} />;
}
