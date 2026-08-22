# mirelab-realtime

"함께 쓰는 기록"의 Yjs 실시간 릴레이. 최종 저장소는 Spring/Postgres 이고, 여기는 무상태
릴레이 + 스냅샷 push/pull 만 한다.

방(room) 이름이 곧 블록(WorkBlock) id 다 — 프론트는 REST API에서 블록 전용 일회용 티켓을
받은 뒤 `/yjs/<blockId>?ticket=<realtime ticket>` 으로 붙는다. 일반 access token 은
WebSocket URL에 넣지 않는다.

## 실행

```bash
npm install
cp .env.example .env   # INTERNAL_SECRET 을 채운다
npm run dev            # .env 를 자동으로 읽는다
npm run build && npm start
```

`npm start`(프로덕션)는 `.env` 를 읽지 않는다 — 환경변수로 넘긴다.

## 환경변수

| 이름 | 기본값 | 설명 |
| --- | --- | --- |
| `PORT` | `1234` | WebSocket 서버 포트 |
| `SPRING_BASE_URL` | `http://localhost:8080` | 백엔드 주소 |
| `INTERNAL_SECRET` | — | **필수.** 백엔드 `mirelab.internal-secret` 과 같은 값 |
| `PERSIST_INTERVAL_MS` | `5000` | 열려 있는 방을 주기적으로 저장하는 간격 |
| `REAUTH_INTERVAL_MS` | `60000` | 살아 있는 접속의 권한을 다시 물어보는 간격 |
| `REAUTH_GRACE_MS` | `300000` | 백엔드가 답을 못 주는 동안 접속을 봐주는 시간 |

`INTERNAL_SECRET` 이 없으면 뜨지 않고 바로 죽는다. 없는 채로 뜨면 스냅샷 저장과 접속 인가가
전부 403 이 되어 편집분이 조용히 유실되기 때문이다.

## 인증

브라우저는 인증된 `POST /api/blocks/<blockId>/realtime-ticket` 요청으로 20초짜리 티켓을
받는다. 릴레이는 접속마다 `POST /internal/blocks/<blockId>/realtime-ticket/consume` 을 호출하고
(헤더: `X-Internal-Secret`, `X-Realtime-Ticket`) 2xx가 아니면 close code `4401` 로 끊는다.
소비는 백엔드의 조건부 DELETE 한 번으로 처리돼 같은 티켓의 동시·반복 사용은 하나만 성공한다.
소비 응답으로 티켓 주인의 `userId` 가 오고, 릴레이는 그 값을 접속에 붙여 기억한다.

### 접속 중 재인가

WebSocket 은 트래픽이 있는 한 nginx 의 `proxy_read_timeout` 도 access token 수명(30분)도
건드리지 않고 며칠이든 살아 있다. 접속 순간의 판정만 믿으면 그 뒤에 거부되거나 스터디에서
빠진 사람이 계속 편집하게 되므로, `REAUTH_INTERVAL_MS` 마다 살아 있는 접속마다
`GET /internal/blocks/<blockId>/access?userId=<userId>` 를 물어본다. 403·404 면 그 자리에서
`4401` 로 끊고, 백엔드가 답을 못 주는(5xx·네트워크 오류) 동안은 `REAUTH_GRACE_MS` 까지만
봐준다 — 한 번의 장애로 편집 중인 사람을 다 끊지 않으면서, 확인이 계속 안 되는 접속을
무기한 열어두지도 않기 위해서다.

끊긴 프론트는 새 티켓을 받아 다시 붙으려 한다. 진짜로 권한을 잃었다면 그 발급이 403 이라
재시도가 멈추고, 일시적인 장애였다면 회복된 뒤 저절로 다시 이어진다.
