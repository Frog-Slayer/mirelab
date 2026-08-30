# 끊긴 자리 — 워크플로우 점검

`슬롯 제거 → 메모·평점 분해 → 서재의 블로그화` 가 연달아 지나가면서 생긴 이음매를 한 번에
훑은 기록이다. 2026-08-30 기준 `ui/post` 브랜치.

찾은 것은 대부분 **버그가 아니라 끊긴 길**이다 — 코드는 도는데 사람이 갈 곳이 없거나,
갔다가 못 돌아오거나, 화면은 있는데 그걸 채울 방법이 없다. 그래서 각 항목마다 "무엇이
없어서 끊겼나"를 먼저 적고 고치는 방향은 그 뒤에 붙인다.

설계 전제는 `design.md` 와 `shelf-blog.md` 를 따른다. 여기서는 그 둘이 약속한 것과 지금
코드가 실제로 하는 것의 차이만 적는다.

---

## 0. 한눈에

| #  | 끊긴 자리                       | 증상                                          | 묶음 |
| -- | ------------------------------- | --------------------------------------------- | ---- |
| 1  | "← 내 서재" 가 글 탭으로 간다   | 책장으로 못 돌아온다                          | A    |
| 2  | 개인 책 삭제 경로 없음          | 잘못 담은 책이 영구히 남는다                  | B    |
| 3  | 일정 수정·삭제 경로 없음        | 날짜를 잘못 잡으면 세션만 쌓인다              | B    |
| 4  | 운영에 스터디를 만들 방법 없음  | 새 DB 로 배포하면 아무도 아무것도 못 한다     | C    |
| 5  | `READING_STUDY_SLUG` 하드코딩   | 남의 책장 링크가 내 기록을 연다               | A    |
| 6  | `ShelfPage` 의 default export   | 라우팅에서 빠졌는데 파일 이름은 페이지        | A    |
| 7  | "이 책에 연결된 글" 은 안 채워짐 | 구조상 절대 비어 있는 섹션                    | D    |
| 8  | 목(mock) 관문 `isRealWorkId`    | 없는 목 데이터를 아직 막고 있다               | D    |
| 9  | 죽은 export 들                  | 다음 사람이 쓸 수 있다고 착각한다             | D    |
| 10 | `@username` 아래 스터디 라우트  | 흰 화면 · 빈 화면                             | E    |
| 11 | 부패한 주석                     | 없는 파일·함수를 가리킨다                     | D    |

묶음은 §6 의 착수 단위다.

---

## 1. 막다른 길

### 1-1. "← 내 서재" 가 서재로 안 간다

`ShelfWorkPage.tsx:72` 가 `/{slug}/shelf` 로 보내는데, 그 경로는 `routes/index.tsx:57` 에서
`MyBlogRedirect` 로 바뀌어 **`/@username`(글 탭)** 으로 떨어진다. 방금 보던 책장
(`/@username/books`)이 아니라 글 목록에 착지한다.

서재가 블로그의 한 탭이 되면서 "내 서재" 라는 목적지가 두 개가 됐다 — 리다이렉트가 가리키는
곳(글)과 사람이 기대하는 곳(책장). 되돌아가는 링크는 **책장 탭**을 직접 가리켜야 한다.

### 1-2. 개인 책을 지울 수 없다

`DELETE /api/works/{workId}` 는 `StudyMembershipGuard.requireWork` 가 `work.study == null`
이면 404 를 낸다. 스터디 작품에만 열린 문이다. `ShelfService` 에는 삭제가 아예 없다.

그래서 서재에 잘못 담은 책은 **상태 변경과 평점만 가능하고 영구히 남는다.** 담는 문
(`addPersonalWork`)만 열고 빼는 문을 안 낸 셈이다.

`ShelfService.saveRating` 의 주석이 이미 같은 이야기를 반대 방향으로 하고 있다 — "읽는 문만
닫고 쓰는 문을 열어두면 화면은 없는데 경로만 살아 있는 상태가 된다." 여기서는 넣는 문만
있고 빼는 문이 없다.

### 1-3. 일정을 고치거나 지울 수 없다

`SessionController` 에는 POST(추가)와 GET(달력·현재 회차)뿐이다. `StartDialog` 에서 날짜를
잘못 잡으면 되돌릴 방법이 없고, 다시 잡으면 같은 작품에 세션만 하나 더 쌓인다.

곁가지로 두 가지가 같이 죽어 있다.

- **`Session.closed` 를 `true` 로 바꾸는 경로가 없다.** `SessionService.currentSession` 의
  주석이 이미 인정하고 있고, 그래서 `meetAt` 이 지난 회차를 날짜로 걸러 우회하는 중이다.
- **`Session.meetAt` 은 nullable 이고** 엔티티 주석은 "미정이면 일정 탭에서 후보를 놓고
  조율해 확정한다"고 하지만, `StartDialog` 는 날짜를 강제하고 확정 API 도 없다. 들어올 수
  없는 상태를 위한 nullable 이다.

### 1-4. 운영에서 스터디를 만들 방법이 없다

`POST /studies` 가 어디에도 없다. 스터디를 만드는 유일한 코드는 `DevDataSeeder` 인데
`@Profile("dev")` 다. `docker-compose.dev.yml` 의 backend 는 `./gradlew bootRun` 으로 도니까
(Dockerfile 의 `dev` 타깃) dev 프로필이 켜지지만, `docker-compose.yml` 의 prod 타깃은
`java -jar` 라 아무 프로필도 안 켠다.

새 DB 로 배포하면:

```
스터디 0개
  → AdminMembersPage 에 "등록된 스터디 없음" 만 뜨고 배정 불가
  → 전원이 "배정된 스터디가 없습니다" 에 갇힘
  → PostService.updatePersonalWorkPublication 은 항상 "독서 스터디가 없습니다"
```

`AdminBootstrap` 이 admin 계정을 보장하는 것과 같은 이유로 — "아무도 들어올 수 없는 잠긴
서비스가 된다" — 스터디도 보장하거나 만들 수 있어야 한다. 지금은 SQL 로 직접 넣는 수밖에
없다.

---

## 2. 잘못 이어진 링크

### 2-1. `READING_STUDY_SLUG` 하드코딩이 화면으로 새어 든다

`BlogPage.tsx:127` 이 `ShelfContents` 에 `currentStudySlug={READING_STUDY_SLUG}` 를 박아
넘긴다. `PostPage.tsx:20` 의 "책장에서 수정" 도 같다.

원래 `ShelfPage.entryHref` 는 **지금 보고 있는 스터디**를 받게 설계됐는데(그 함수 주석 참고),
블로그로 옮기면서 그 축이 상수로 굳었다. 결과:

- 개인 책 링크가 `/reading/shelf/:workId` 로 고정된다.
- 그 경로는 `ShelfWorkPage` → `GET /me/shelf/{id}` 라 **누구의 블로그를 보고 있든 항상 내
  기록을 연다.** (남의 개인 책은 `ShelfService.list` 가 애초에 안 내려주므로 지금은 링크가
  안 생기지만, 축이 상수인 이상 구조가 막아주는 게 아니라 우연히 안 부딪히는 것이다.)
- `reading` 멤버가 아닌 사람에게는 `RequireStudyMember` 벽이 먼저 뜬다.

스터디가 하나뿐이라 지금은 맞는 값이다. 스터디가 둘이 되는 순간 조용히 틀린다.

### 2-2. `ShelfPage` 의 default export 는 죽었다

라우팅에서 빠졌고 어디서도 import 하지 않는다 — `BlogPage` 가 `AddDialog` 와
`ShelfContents` 만 가져간다. 딸려서 `getShelf()` 와 백엔드 `GET /api/me/shelf` 도 호출자가
없어졌다(블로그는 `/users/{username}/shelf` 를 쓴다).

파일 이름이 "페이지" 라 다음에 볼 때 또 헷갈린다. 실체는 이제 `ShelfContents` 컴포넌트
모듈이다.

---

## 3. 만들 수 없는데 그리는 화면

### 3-1. "이 책에 연결된 글" 은 구조상 절대 안 채워진다

`WorkPage.tsx:344` 이 그리는 섹션인데, 글에 작품을 붙이는 경로가 하나뿐이다.

- `Post.work` 를 세팅하는 유일한 곳이 `PostService.updatePersonalWorkPublication` 이고,
  거기 `requirePersonalWork` 는 `work.study != null` 이면 거부한다.
- `PostService.update` 는 `input.workId != post.work?.id` 를 400 으로 막고,
  `PostEditorPage` 에는 작품을 고르는 UI 가 없다(`shelf-blog.md` §3-2 가 그렇게 정했다).

즉 **글에 붙을 수 있는 작품은 개인 책뿐**이고, `WorkPage` 는 스터디 작품 전용이다
(`WorkService.getDetail` 이 `work.study == null` 이면 null 을 낸다). `getWorkPosts` 는 항상
빈 배열이다.

`shelf-blog.md` 는 "작품 상세의 연결 글"을 4단계 산출물로 적어뒀는데, 개인 책에는 그 상세
화면이 없다(`ShelfWorkPage` 는 발행 컨트롤을 따로 갖는다). 그래서 이 섹션은 **약속과 구현이
서로 다른 작품을 가리키고 있다.** 스터디 책에서 글을 쓰는 길을 열든지, 섹션을 걷어내든지
둘 중 하나다.

### 3-2. 목(mock) 관문이 남아 있다

`workBlockApi.isRealWorkId` 와 그걸 쓰는 `WorkPage.tsx:408` 의 "목 데이터라 여기서는 안
됩니다" 분기. 프론트에 목 레이어는 이제 없고 모든 workId 가 UUID 다. 이 관문이 지금 하는
일은 메모·블록 쿼리를 한 번 더 막는 것뿐이다.

### 3-3. 죽은 export 들

| 것                                          | 대체된 것                        |
| ------------------------------------------- | -------------------------------- |
| `adminApi.approveAccessRequest` · `reject…` | `changeAccessRequestStatus`      |
| `ScheduleItem.kind: 'EVENT'` · `note`       | 생산자가 없다                    |
| `PostService.toSummary/toResponse` 의 `viewerId` · `viewerStudyIds` | 안 읽는다 |

`approve` · `reject` 는 백엔드 엔드포인트까지 셋 다 살아 있다.

---

## 4. `@username` 아래 스터디 라우트

여기가 제일 위험하다. `routes/index.tsx` 의 `:studySlug` 아래 **모든** 자식이 `@username`
에도 그대로 붙는다. `IdentityGuard` 는 `index` 와 `books` 만 갈라주고 나머지는 통과시킨다.

| URL                        | 지금 벌어지는 일                                        |
| -------------------------- | ------------------------------------------------------- |
| `/@yeongseo/sessions`      | `SchedulePage` → `getStudy('@yeongseo')` 404 → 빈 화면   |
| `/@yeongseo/books/:workId` | `WorkPage` → **TypeError 로 흰 화면** (아래)             |
| `/@yeongseo/shelf/:workId` | `ShelfWorkPage` → `useStudy` null → "내 서재에 없는 책"   |

흰 화면의 원인은 `IdentityRoutes.tsx:15` 의 맨 `<Outlet />` 이다. react-router 는 `<Outlet />`
을 **항상** `OutletContext.Provider value={context}` 로 감싸므로
(`node_modules/react-router/dist/*/lib/hooks.js:395`), context 를 안 넘기면 부모가 준 값을
`undefined` 로 덮어쓴다. `RequireStudyMember` 는 이걸 알고 `<Outlet context={recordDrawer} />`
로 넘기는데 `IdentityGuard` 는 안 한다. 그 아래에서 `useRecordDrawer()` 를 구조분해하는
`WorkPage` 가 터진다.

지금은 링크로 도달할 수 없다. 하지만 주소창·북마크·검색엔진은 링크를 안 거친다.

**방향** — `@` 갈래는 자식 라우트를 따로 갖는 편이 맞다. `IdentityGuard` 에서 갈래를 나누는
지금 구조를 유지한다면, 최소한 (a) context 를 통과시키고 (b) `@` 아래 미지원 경로를
`NotFoundPage` 로 보내야 한다.

---

## 5. 부패한 주석

다음 사람을 틀린 곳으로 보내는 것들. 고치는 비용이 거의 없다.

- `application.properties` 의 `open-in-view` 설명이 `SlotController.slotEvents` 를 가리킨다
  → 지금은 `RatingController` 의 rating-events.
- `ShelfWorkPage.tsx:28` 이 "`[ShelfPage]` 의 entryHref" 를 참조 → 그 페이지는 라우팅에서
  빠졌다(§2-2).
- `MemberRatings.tsx` 의 "이름 → 그 사람의 서재로 간다" → 실제론 블로그 글 탭이다.
- `WorkPage.tsx` 의 "빈 메모는 자리를 뜰 때 거둬지므로(MyRecordDrawer)" → 실제로 거두는
  곳은 `WorkNoteCard.collectIfEmpty` 다.

한 방향으로만 걸린 것도 하나 있다 — `SignupPage` 에서 내 색을 고르지만 `SettingsPage` 에는
색 변경이 없다(사진·이름만). Yjs 커서 색이 여기서 나오는데, 한 번 고르면 못 바꾼다.

---

## 6. 손대는 순서

무게순이 아니라 **한 번에 고칠 수 있는 단위**로 묶었다. 섞으면 어긋났을 때 원인을 못 찾는
것은 `shelf-blog.md` §4 의 이유와 같다.

| 묶음 | 내용                                                          | 검증                       |
| ---- | ------------------------------------------------------------- | -------------------------- |
| C    | 스터디 생성 — 운영 부트스트랩 또는 admin 화면 (§1-4)           | `./gradlew test` (컨테이너 안) |
| A    | 서재·블로그 링크 축 정리 — §1-1 · §2-1 · §2-2 · §5             | `tsc` · `oxlint` · `build` |
| E    | `@username` 라우트 분리 — §4                                   | 같음                       |
| B    | 삭제·수정 경로 — 개인 책(§1-2) · 일정(§1-3)                    | 양쪽                       |
| D    | 잔재 정리 — §3-1 · §3-2 · §3-3 · §5                            | 양쪽                       |

C 가 맨 앞인 이유는 하나다 — 그게 없으면 새 환경에서 나머지를 **검증할 수가 없다.**

A 를 순수한 링크 정리로 못 박는 게 중요하다. `ShelfPage` 를 컴포넌트 모듈로 다시 이름 짓는
일과 `entryHref` 의 축을 되돌리는 일은 같은 결의 변경이지만, 거기에 §1-2(삭제)를 얹으면
`ShelfService` 까지 같이 흔들린다.

D 는 언제 해도 되고 안 해도 당장 아무 일도 안 일어난다. 다만 §3-1 은 **결정이 먼저다** —
스터디 책에 글을 붙일 것인가. 그걸 정하기 전에는 섹션을 지우지 않는 편이 낫다.

---

## 7. 안 다룬 것

- 성능·N+1. `ShelfService` 와 `WorkService` 는 이미 배치 조회로 정리돼 있다.
- 실시간 릴레이(`mirelab-realtime`). 티켓 소비·재인가·스냅샷 유예까지 촘촘하고, 끊긴
  곳을 못 찾았다.
- 자동저장(`useDebouncedSave` · `draftStore` · `NoteBody`). 순서 보장·재시도·로컬 사본까지
  물려 있다. 다만 메모를 지울 때 그 draft 키가 안 지워져 localStorage 에 남는다 — 읽는
  사람이 없으니 새는 것은 용량뿐이다.
- 인증·가입 흐름. `pending → PROFILE_REQUIRED → 가입 완료` 가 화면 문구까지 맞는다.
