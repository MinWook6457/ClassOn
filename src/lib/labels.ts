// 클라이언트 컴포넌트에서도 쓰는 값. 서버 전용 모듈(db 등)을 import 하지 않는다.
export type NotifyChannel = 'kakao' | 'sms' | 'off';
export const CHANNEL_LABEL: Record<NotifyChannel, string> = { kakao: '알림톡', sms: '문자', off: '끔' };
