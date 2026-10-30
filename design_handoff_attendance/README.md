# Handoff: 학원 출결 관리 웹앱

## Overview
학원용 출결 관리 웹앱입니다. 사용자는 두 부류입니다.
- **학생**: 각자 휴대폰에서 출결 페이지를 열어 등원/하원을 고르고, 본인 PIN 4자리를 입력합니다.
- **원장·강사**: PC에서 오늘 출결 현황 확인, 강의 등록(시간·요일·참여 학생 지정), 학생 관리(PIN 발급), 출결 기록 조회와 내보내기를 합니다. 원장과 강사의 권한은 동일합니다.

등원·하원 시점에 학부모에게 알림(카카오 알림톡 또는 문자)을 보냅니다. 학원 규모는 학생 100명 이상을 전제로 합니다.

## About the Design Files
이 폴더의 파일은 **HTML로 만든 디자인 참고 자료**입니다. 의도한 모양과 동작을 보여주는 프로토타입이며, 그대로 배포할 프로덕션 코드가 아닙니다. 작업은 이 디자인을 실제 코드베이스 환경(React, Vue 등)의 기존 패턴과 라이브러리로 **다시 구현**하는 것입니다. 아직 환경이 없다면 적절한 스택을 고르세요. 권장 구성은 Next.js(App Router) + TypeScript + PostgreSQL(또는 Supabase)이며, 스타일은 동봉한 `styles.css`의 토큰과 클래스를 그대로 가져가는 방식을 권합니다.

`출결 관리.dc.html`은 브라우저에서 바로 열립니다. 같은 폴더의 `support.js`(프로토타입 런타임)와 `styles.css`가 필요합니다. 파일 안의 `class Component` 부분이 데모 로직과 목업 데이터입니다.

## Fidelity
**High-fidelity.** 색, 타이포, 간격, 상호작용은 최종안 기준입니다. 단, 학생 화면은 3안(1a/1b/1c), 대시보드는 2안(1d/1e)을 비교용으로 둔 상태이므로 **구현 전에 각 1안을 확정**해야 합니다. 확정 전이라면 학생 화면 1b, 대시보드 1d를 기본으로 하세요(1e의 강의별 카드는 대시보드의 두 번째 탭으로 넣을 수 있습니다).

## Screens / Views

공통 규칙
- 학생 화면: 폭 375px 기준 모바일, 높이 760px 프레임에서 디자인됨. 실제로는 `100dvh` 전체 높이, 키패드는 화면 하단에 고정.
- 관리자 화면: 폭 1280px 기준 데스크톱. 상단 `.nav` 바(브랜드 "새봄학원 출결" + 탭: 오늘 출결 / 강의 / 학생 / 기록 + 우측 사용자명), nav 하단 1px `--color-divider` 경계, 콘텐츠 패딩 24–26px 28px.
- 모든 버튼·입력·태그·카드는 **모서리 0(각진 형태)**. 강조 카드는 `.blueprint` + 4개의 `<i class="corner tl|tr|bl|br">`(모서리 + 표시).
- 아이콘은 Lucide, stroke-width 1.5. 사용: log-in, log-out, delete(백스페이스), chevron-left, check, bell, search, plus, download.

### 1. 학생 입력 (모바일)
**목적**: 등원/하원 선택 → PIN 4자리 → 결과 확인.

**1a 한 화면형**
- 상단: "새봄학원 출결"(heading 18px/600) 좌측, 날짜·시각(13px, neutral-700) 우측. 패딩 22px.
- 등원/하원 토글: 2열 grid, 높이 52px, 18px. 선택된 쪽 `.btn-primary`, 나머지 `.btn-secondary`. 기본값 등원.
- 안내 문구 "{등원|하원} 비밀번호 4자리를 입력하세요"(15px), 토글 아래 44px.
- PIN 표시: 원 4개 16px, 간격 18px. 입력됨=accent 채움, 미입력=1.5px neutral-500 테두리.
- 오류 문구 영역(최소 40px, 13px, accent-800).
- 키패드: 3×4 격자, 키 높이 68px, 1px divider 격자선이 보이게. 숫자 heading 30px. 배열 1–9, [전체 지움], 0, [⌫]. hover accent-100, active accent-200.

**1b 2단계형**
- 1단계: 날짜(13px) + 큰 시계(heading 400, 88px). 하단에 높이 150px 대형 버튼 2개(간격 22px): "등원하기"(primary, blueprint 마크) / "하원하기"(secondary). 아이콘 28px 좌상단, 라벨 34px 좌하단.
- 2단계: "‹ 처음으로"(ghost) → 모드명(heading 34px) → "내 비밀번호 4자리" → 4칸 박스(높이 64px, 간격 10px, 입력 시 ●) → 오류 → 키패드(3열, 간격 10px, 키 높이 62px, `.btn-secondary`, 28px).

**1c 스틸 헤더형**
- 상단 필드 배경 `--color-accent-900`, 글자 paper(`--color-bg`), 보조 글자 accent-200. 시계 heading 64px. 아래 등원/하원 토글(accent-700 테두리, 선택=bg 채움 + accent-900 글자, 높이 46px).
- PIN 표시: 26×4px 막대 4개(입력=accent, 미입력=neutral-300).
- 키패드: 테두리 없음, 키 높이 74px, 숫자 36px, hover neutral-200.
- 하단 안내 "비밀번호를 잊었다면 선생님께 말씀해 주세요"(12px, neutral-600).

**결과 화면(3안 공통 정보)**
- 표시 항목: 상태(등원 완료/하원 완료), 학생 이름(heading 40–52px), 시각, 정시/지각 여부 태그, 오늘 수강 강의(강의명·시간·강의실·담당 강사), 격려 메시지, "학부모님께 {등원|하원} 알림을 보냈어요"(bell 아이콘), 하단 "확인" `.btn-primary` 높이 52px.
- 상태 라벨 규칙
  - 등원: 도착 시각 > 강의 시작 시각(+ 강의별 지각 기준) → "N분 지각"(`.tag-outline`), 아니면 "정시 등원"(`.tag-neutral`)
  - 하원: 하원 시각 < 강의 종료 시각 → "N분 일찍 하원"(`.tag-outline`), 아니면 "정상 하원"
- "확인" 또는 일정 시간(권장 8초) 후 초기 화면으로 복귀(1b는 1단계로).

### 2. 오늘 출결 대시보드 (1d 목록형)
- 제목 "오늘 출결"(h2) + "2026년 10월 30일 금요일 · 16:05 기준".
- KPI 5칸 grid(hairline 격자): 오늘 수강 예정 / 재원 중 / 하원 / 미등원 / 지각. 숫자 heading 600 36px + " 명".
- 툴바: 검색 입력(260px, 좌측 search 아이콘) + 상태 세그먼트(전체·재원 중·하원·미등원·지각 + 건수, 선택=accent 채움) + 우측 "N명 중 M명 표시".
- 표 `.table` 열: 이름 / 학년 / 강의 / 시작 / 등원 / 하원 / 상태 / 학부모 알림. 상태 태그: 재원 중=`tag-accent`, 하원=`tag-neutral`, 미등원=`tag-outline`, 지각은 추가 `tag-outline` "N분 지각". 알림 열: "등원 알림 16:05" / "하원 알림 16:22" / 시작 지난 미등원은 "미등원 안내 대기" / 그 외 "—".
- 100명 이상이므로 실제 구현은 페이지네이션 또는 가상 스크롤.

### 3. 오늘 출결 대시보드 (1e 강의 보드형)
- 좌측 본문 + 우측 300px "실시간 기록" 사이드바(좌측 border).
- 강의 카드 3열 grid(간격 26px), `.blueprint`: 시간·강의실(12px accent-700), 진행 태그(예정 `tag-outline` / 수업 중 `tag-accent` / 종료 `tag-neutral`), 강의명 heading 21px, "담당 강사 · 등원 n/N", 4px 진행 막대(accent / neutral-300), 학생 목록(점 8px: 재원=accent 채움, 그 외 빈 원, 우측 "등원 16:05"/"하원 16:22"/"미등원").
- 실시간 기록: 시각(44px 열) + "이름 등원/하원" + 보조줄(강의명 · 지각 여부). 최신순.

### 4. 강의 등록/편집 (1f)
- 좌측 300px 강의 목록(선택 행: 좌측 3px accent 바 + accent-100 배경, 항목 "요일 시간 · N명"), 상단 "새 강의" 버튼.
- 우측 편집 영역 2열
  - 왼쪽 열: 강의명, 담당 강사(select), 강의실, 요일(월~일 7칸 토글, 선택=accent 채움), 시작/종료 시간(time 입력), 지각 기준 세그먼트(시작 시각 이후 / 5분 이후 / 10분 이후), 요약 blueprint 박스 "매주 월·수·금 16:00–17:50 · 301호 · 학생 N명".
  - 오른쪽 열: "참여 학생 · N명 선택" + 검색(이름/학년) + 체크박스 목록(높이 396px 스크롤).
- 상단 우측 "강의 삭제"(ghost), "저장"(primary).
- 검증: 강의명 필수, 요일 1개 이상, 종료 > 시작. 같은 학생이 같은 요일·겹치는 시간의 다른 강의에 있으면 경고 권장.

### 5. 학생 관리 · PIN 발급 (1g)
- 본문: "학생 128명", 검색, "학생 등록"(primary). 표 열: 이름 / 학년 / 수강 강의 / PIN(항상 •••• 마스킹) / 학부모 연락처 / 알림(알림톡·문자=`tag-neutral`, 끔=`tag-outline`). 행 클릭 시 선택(accent-100).
- 우측 340px 상세 패널: 학년·수강 강의, 이름(h3), blueprint 박스 "출결 비밀번호" 4칸(높이 58px, heading 32px, 기본 •), "PIN 보기/숨기기"(secondary) + "PIN 재발급"(primary), 안내문. 아래 정보 행: 학부모 연락처 / 등·하원 알림(알림톡·문자·끔 세그먼트) / 이번 달 출석 "18/19일". "출결 기록 보기 →"(ghost).
- 재발급 후 문구: "새 PIN이 발급됐어요. 학생에게 전달해 주세요. 이전 PIN은 더 이상 쓸 수 없어요."

### 6. 출결 기록 조회/내보내기 (1h)
- 상단 우측 "CSV"(secondary), "엑셀로 내보내기"(primary), download 아이콘.
- 필터: 기간 세그먼트(오늘/이번 주/이번 달/직접 선택), 날짜 범위, 강의 select, 학생 검색.
- 요약 4칸: 출석률 / 지각 / 결석 / 평균 체류.
- 표 열: 날짜 / 학생 / 강의 / 등원 / 하원 / 체류 / 상태(출석=`tag-neutral`, 지각·조기 하원=`tag-outline`, 결석=`tag-accent`). 하단 "1,842건 중 1–10" + 페이지네이션.
- 내보내기는 현재 필터 결과 전체를 대상으로 함.

## Interactions & Behavior
- **PIN 입력**: 숫자 키를 누르면 1자리 추가, 4자리가 되면 약 220ms 뒤 자동 제출. ⌫은 1자리 삭제, "전체 지움"은 초기화. 모드를 고르기 전에는 입력 불가(1b).
- **PIN 오류**: 해당 PIN이 없으면 "등록되지 않은 비밀번호예요. 다시 입력해 주세요." 표시 후 입력 초기화. 연속 5회 실패 시 30초 잠금 권장.
- **중복 처리(권장)**: 이미 등원한 학생이 다시 등원 → "이미 16:05에 등원했어요" 안내. 등원 기록 없이 하원 → 하원 기록은 남기고 대시보드에 확인 필요로 표시.
- **오늘 수강 강의 결정**: 오늘 요일에 배정된 강의 중 현재 시각과 가장 가까운 강의. 여러 강의면 첫 강의 기준으로 지각, 마지막 강의 기준으로 조기 하원 판정.
- **학부모 알림**: 등원/하원 기록 즉시 비동기 발송(알림톡 실패 시 문자 대체). 발송 결과를 기록에 저장해 대시보드 "학부모 알림" 열에 표시.
- **대시보드 실시간 갱신**: 새 출결 이벤트를 SSE/WebSocket 또는 10초 폴링으로 반영.
- **PIN 재발급**: 학원 전체에서 겹치지 않는 4자리 무작위(0000–9999). 저장은 해시로.
- hover/active/focus 상태는 `styles.css`에 정의된 것을 그대로 사용(`:focus-visible` 2px accent 아웃라인).

## State Management / 데이터 모델
```
Student   { id, name, grade, pinHash, parentPhone, notifyChannel: 'kakao'|'sms'|'off', active }
Teacher   { id, name, email, passwordHash }            // 원장·강사 동일 권한
Course    { id, name, teacherId, room, days: ('월'..'일')[], startTime, endTime, lateThresholdMin: 0|5|10 }
Enrollment{ courseId, studentId }
Attendance{ id, studentId, date, checkInAt?, checkOutAt?, courseId?, lateMin, earlyLeaveMin }
Notification { id, attendanceId, type:'in'|'out', channel, status, sentAt }
```
API(예시)
- `POST /api/checkin { pin, mode:'in'|'out' }` → `{ student, course, time, label, cheer, notified }` (인증 불필요, 학원별 공개 URL + rate limit)
- `GET /api/dashboard/today` · `GET/POST/PATCH/DELETE /api/courses` · `GET/POST/PATCH /api/students` · `POST /api/students/:id/reissue-pin` · `GET /api/attendance?from&to&courseId&q` · `GET /api/attendance/export?format=csv|xlsx`

학생 화면 클라이언트 상태: `mode`(in|out|null), `pin`(string), `result`(응답|null), `error`(string).

## Design Tokens (styles.css 기준)
- 색: bg `#f2f2f3`, surface `#e9e9ea`, text `#1d1f20`, accent `#5980a6`, divider = text 16% 투명.
  - accent ramp 100 `#eef6ff` · 200 `#d6ebff` · 300 `#b5d9fd` · 400 `#94bce3` · 500 `#749dc4` · 600 `#597ea3` · 700 `#416180` · 800 `#2c455d` · 900 `#1d2d3d`
  - neutral ramp 100 `#f5f5f8` · 200 `#e7e7ea` · 300 `#d4d4d7` · 400 `#b7b7ba` · 500 `#98989b` · 600 `#7a7a7d` · 700 `#5d5d60` · 800 `#424244` · 900 `#2b2b2d`
  - 본문 크기의 accent 텍스트는 accent-700 이상 사용.
- 폰트: 제목 Barlow Condensed 600, 본문 Barlow 400/500. 한글은 시스템 폰트로 대체됨 → 실제 구현에서는 한글 폰트(예: Pretendard)를 각 font-family 뒤에 추가하는 것을 권장.
- 타입: h1 42 / h2 32 / h3 25 / h4 20, 본문 15px/1.55, 표 14px, 표 헤더 11px uppercase letter-spacing .08em.
- 간격: 3.4 / 6.8 / 10.2 / 13.6 / 20.4 / 27.2px (`--space-1/2/3/4/6/8`).
- 반경: 모든 컴포넌트 0.
- 그림자: `--shadow-sm/md/lg` (styles.css 참조).

## Assets
이미지 없음. 아이콘은 Lucide(lucide.dev, stroke-width 1.5). 학생·강의·기록 데이터는 모두 목업입니다.

## Files
- `출결 관리.dc.html` — 전체 화면 시안(1a–1h). 템플릿 마크업이 레이아웃 정본이고, 하단 `class Component`가 데모 로직과 목업 데이터.
- `styles.css` — Industry 디자인 시스템 토큰과 컴포넌트 클래스(.btn, .tag, .input, .seg, .table, .nav, .blueprint 등).
- `support.js` — HTML 시안을 브라우저에서 여는 데 필요한 런타임(구현에는 불필요).

데모 PIN: 1234(김서연), 2580(이준호), 0000(박지민). 데모 시각은 등원 16:05, 하원 17:52로 고정.
