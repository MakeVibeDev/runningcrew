# 피드백 시스템 설정 가이드

## 개요
사용자들로부터 버그 제보 및 개선 의견을 Slack으로 받을 수 있는 피드백 시스템이 구현되어 있습니다.

## 기능
- 우측 하단 플로팅 버튼 (💬)
- 모달 형태의 피드백 폼
- 버그 제보 / 개선 의견 분류
- Slack으로 실시간 전송
- 사용자 정보, 페이지 URL, User Agent 자동 포함

## Slack Webhook 설정 방법

### 1. Slack Incoming Webhook 생성

1. Slack 워크스페이스에 로그인
2. https://api.slack.com/apps 접속
3. **"Create New App"** 클릭
4. **"From scratch"** 선택
5. App 이름 입력 (예: "RunningCrew Feedback")
6. 워크스페이스 선택
7. **"Incoming Webhooks"** 메뉴 클릭
8. **"Activate Incoming Webhooks"** 토글 켜기
9. **"Add New Webhook to Workspace"** 클릭
10. 피드백을 받을 채널 선택 (예: #feedback, #bugs)
11. **"Allow"** 클릭
12. 생성된 Webhook URL 복사 (형식: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`)

### 2. 환경 변수 설정

`.env.local` 파일에 Webhook URL 추가:

```bash
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

### 3. 서버 재시작

```bash
npm run dev
```

## 피드백 메시지 형식

Slack으로 전송되는 메시지에는 다음 정보가 포함됩니다:

- **분류**: 🐛 버그 제보 / 💡 개선 의견
- **사용자 정보**: 이름, 이메일
- **페이지**: 피드백을 작성한 페이지 URL
- **내용**: 사용자가 작성한 피드백 내용
- **User Agent**: 브라우저 정보
- **User ID**: Supabase User ID (로그인 시)
- **접수 시각**: 한국 시간(KST)

## 테스트

1. 개발 서버 실행: `npm run dev`
2. 브라우저에서 애플리케이션 접속
3. 우측 하단 플로팅 버튼 클릭
4. 피드백 작성 후 전송
5. Slack 채널에서 메시지 확인

## 문제 해결

### Webhook URL이 작동하지 않는 경우
- Slack Incoming Webhook이 활성화되어 있는지 확인
- Webhook URL이 올바르게 복사되었는지 확인
- `.env.local` 파일이 루트 디렉토리에 있는지 확인
- 서버를 재시작했는지 확인

### 메시지가 전송되지 않는 경우
- 브라우저 콘솔에서 에러 확인
- 네트워크 탭에서 `/api/feedback` 요청 확인
- 서버 로그 확인

## 커스터마이징

### 메시지 형식 변경
`src/app/api/feedback/route.ts` 파일에서 `slackMessage` 객체를 수정하세요.

### 버튼 위치/스타일 변경
`src/components/feedback-button.tsx` 파일에서 버튼의 위치와 스타일을 조정하세요.

### 모달 디자인 변경
`src/components/feedback-modal.tsx` 파일에서 모달의 디자인과 폼을 수정하세요.
