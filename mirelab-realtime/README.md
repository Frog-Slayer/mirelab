# mirelab-realtime

"함께 쓰는 기록"의 Yjs 실시간 릴레이. 최종 저장소는 Spring/Postgres 이고, 여기는 무상태
릴레이 + 스냅샷 push/pull 만 한다.

방(room) 이름이 곧 블록(WorkBlock) id 다 — 프론트는 `/yjs/<blockId>?token=<access token>` 으로 붙는다.

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

`INTERNAL_SECRET` 이 없으면 뜨지 않고 바로 죽는다. 없는 채로 뜨면 스냅샷 저장과 접속 인가가
전부 403 이 되어 편집분이 조용히 유실되기 때문이다.

## 인증

접속마다 백엔드에 `POST /internal/blocks/<blockId>/authorize` 로 한 번 물어보고
(헤더: `X-Internal-Secret`, `Authorization: Bearer <access token>`) 200 이 아니면 close code
`4401` 로 끊는다. 여기서 JWT 를 직접 검증하지 않는 이유는 `src/auth.ts` 주석 참고 — 서명만
봐도 "그 사람이 *이 방*에 들어와도 되나" 는 알 수 없다.
