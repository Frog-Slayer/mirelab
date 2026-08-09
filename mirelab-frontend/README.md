# mirelab-frontend

Vite + React 19 + TypeScript 기반 프론트엔드.

## 스택

- **Vite 8** — 개발 서버 / 번들러
- **React 19** + **TypeScript**
- **React Router** (`createBrowserRouter`) — 라우팅
- **TanStack Query** — 서버 상태 관리
- **Tailwind CSS v4** (`@tailwindcss/vite`) — 스타일
- **oxlint** + **Prettier** — 린트 / 포맷

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
```

| 스크립트            | 설명                          |
| ------------------- | ----------------------------- |
| `npm run dev`       | 개발 서버                     |
| `npm run build`     | 타입체크 + 프로덕션 빌드      |
| `npm run preview`   | 빌드 결과 미리보기            |
| `npm run lint`      | oxlint                        |
| `npm run format`    | Prettier 적용                 |
| `npm run typecheck` | 타입체크만                    |

## 백엔드 연동

`vite.config.ts` 의 dev 프록시가 `/api/*` 요청을 `http://localhost:8080` 으로 넘긴다.
브라우저 기준으로는 same-origin 이므로 개발 중 CORS 설정이 필요 없다.

배포 등에서 백엔드를 직접 가리켜야 하면 `.env` 에 `VITE_API_BASE_URL` 을 설정한다
(`.env.example` 참고).

API 호출은 `src/lib/api.ts` 의 `api` 헬퍼를 쓴다. 실패 시 `ApiError`(`status`, `body`)를 던지고,
`queryClient` 는 4xx 를 재시도하지 않는다.

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const { data } = useQuery({
  queryKey: ['posts'],
  queryFn: () => api.get<Post[]>('/posts'),
})
```

## 디렉터리

```
src/
  components/layout/   공통 레이아웃
  lib/                 api 클라이언트, queryClient
  pages/               페이지 컴포넌트
  routes/              라우터 정의
```

`@/` 는 `src/` 로 매핑된다 (`vite.config.ts` + `tsconfig.app.json`).
