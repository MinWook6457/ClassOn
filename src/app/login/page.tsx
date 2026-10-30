'use client';

import { useActionState } from 'react';
import { Corners } from '@/components/Corners';
import { login } from './actions';

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="login-wrap">
      <form action={action} className="blueprint login-box">
        <Corners />
        <div>
          <h3 style={{ margin: 0 }}>출결 관리</h3>
          <div className="muted" style={{ fontSize: 13 }}>원장·강사 로그인</div>
        </div>
        <div className="field"><label htmlFor="email">이메일</label>
          <input id="email" name="email" type="email" className="input" autoComplete="username" required autoFocus />
        </div>
        <div className="field"><label htmlFor="password">비밀번호</label>
          <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
        </div>
        <div className="error-text" role="alert" style={{ minHeight: 18 }}>{error}</div>
        <button className="btn btn-primary" disabled={pending} style={{ height: 42 }}>로그인</button>
      </form>
    </main>
  );
}
