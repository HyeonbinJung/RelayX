# RelayX
Real-Time Cross-Platform Messaging Relay (Discord, WhatsApp)

---

## MIDAS WhatsApp ↔ Discord Bridge — 10 Pair Edition

한 WhatsApp 봇 계정으로 **최대 10개의 WhatsApp 그룹 ↔ Discord 채널**을 양방향 연결합니다.

## 현재 기본 매핑

`.env`에 아래 Discord 채널은 미리 입력되어 있습니다.

- Pair 01 — PM: `1544389164664098938`
- Pair 02 — HC: `1544419242403823696`

WhatsApp 그룹 ID만 채우면 됩니다.

## 매핑 추가 방법

`.env`의 각 Pair에 이름, Discord Channel ID, WhatsApp Group ID를 넣습니다.

```env
PAIR_03_NAME=Research
PAIR_03_DISCORD_CHANNEL_ID=123456789012345678
PAIR_03_WHATSAPP_GROUP_ID=120363XXXXXXXXXXXX@g.us
```

Pair 01 ~ Pair 10 중 **Discord/WhatsApp ID가 모두 들어간 Pair만 자동 활성화**됩니다.
사용하지 않는 Pair는 비워두면 됩니다.

## 최초 설치

Windows CMD에서 Puppeteer 다운로드 문제가 생기면 이 프로젝트에는 `.puppeteerrc.cjs`가 포함되어 있어 별도 Chrome 다운로드를 건너뜁니다. 시스템 Chrome을 직접 사용합니다.

```powershell
npm install
```

## WhatsApp 그룹 ID 찾기

```powershell
npm run groups
```

ID를 알고 싶은 그룹에서 아무 메시지나 보내면 터미널에 다음처럼 표시됩니다.

```text
GROUP ID : 120363XXXXXXXXXXXX@g.us
MESSAGE  : TEST
```

이 값을 `.env`의 해당 `PAIR_XX_WHATSAPP_GROUP_ID`에 넣습니다.

## 실행

```powershell
npm start
```

정상이면 다음과 같이 활성화된 매핑 수가 표시됩니다.

```text
🚀 MIDAS Bridge 시작 — 활성 매핑 4/10
✅ Discord Bot Ready: ...
✅ WhatsApp Bot Ready
```

## Discord 설정

Discord Developer Portal의 Bot 메뉴에서 **Message Content Intent**를 ON으로 설정해야 합니다.

Discord 봇에는 연결 대상 채널에 최소 다음 권한이 필요합니다.

- View Channel
- Send Messages
- Read Message History
- Attach Files

## 지원 기능

- 최대 10개 독립 매핑
- WhatsApp → Discord 텍스트 전달
- Discord → WhatsApp 텍스트 전달
- 양방향 기본 첨부파일 전달
- 작성자 이름 표시
- WhatsApp 봇 자신의 메시지 재전송 방지
- Discord 봇 메시지 재전송 방지
- 잘못 입력된/중복된 매핑 검사
- `getChats()` 없이 WhatsApp 그룹 ID 확인

## 참고

`whatsapp-web.js`는 공식 WhatsApp Cloud API가 아니라 WhatsApp Web 자동화 방식입니다. 봇 전용 WhatsApp 번호 사용을 권장합니다.
