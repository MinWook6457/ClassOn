import { redirect } from 'next/navigation';

// 학생용 주소는 /checkin, 선생님용은 /admin
export default function Home() {
  redirect('/admin');
}
