# 학원 출결 관리 (웹앱)

학생은 휴대폰에서 등원/하원을 고르고 PIN 4자리를 입력하고, 원장·강사는 PC에서 출결 현황·강의·학생·기록을 관리합니다.
디자인 정본은 `design_handoff_attendance/`입니다(학생 화면 1b, 대시보드 1d + 강의별 보기 탭 1e).

## 실행

```bash
npm install
npm run seed     # 데모 데이터 생성 (data/attendance.db 를 지우고 새로 만듦)
npm run dev      # http://localhost:3000
```

| 주소 | 용도 |
| --- | --- |
| `/checkin` | 학생용 등원·하원 (로그인 없음) |
| `/admin` | 오늘 출결 (학생 목록 / 강의별 보기) |
| `/admin/courses` | 강의 등록·편집 (요일, 시간, 지각 기준, 참여 학생) |
| `/admin/students` | 학생 관리, PIN 보기·재발급, 알림 설정 |
| `/admin/records` | 출결 기록 조회, CSV·엑셀 내보내기 |

데모 계정: `admin@saebom.kr` / `admin1234` (강사 계정도 같은 비밀번호)
데모 PIN: `1234`(김서연) · `2580`(이준호) · `0000`(박지민)

## 구성

- Next.js 15 (App Router) + TypeScript, SQLite(better-sqlite3), 파일은 `data/`에 저장
- `src/lib/checkin.ts` 등원·하원 처리, 지각·조기 하원 판정, PIN 연속 5회 오류 시 30초 잠금
- `src/lib/today.ts` 대시보드 데이터, `src/lib/records.ts` 기록 조회(결석 자동 산출)
- `src/lib/notify.ts` 학부모 알림 — **아직 실제 발송 업체가 연결되지 않아** 콘솔에 남기고 '보냄'으로 기록합니다
- 시각은 모두 KST 기준. 시연용으로 `DEMO_NOW=2026-10-30T16:05` 를 주면 시각을 고정할 수 있습니다

## 환경 변수

| 이름 | 설명 |
| --- | --- |
| `APP_SECRET` | 세션 서명·PIN 암호화 키. 없으면 `data/.secret` 을 자동 생성합니다. **바뀌면 기존 PIN을 읽을 수 없으니** 운영에서는 고정해 두세요 |
| `NEXT_PUBLIC_ACADEMY_NAME` | 학원 이름 (기본값 새봄학원) |
| `DEMO_NOW` | 현재 시각 고정 (시연용) |
