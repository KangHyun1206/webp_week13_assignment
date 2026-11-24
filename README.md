# Practice · Anonymous Message Board
## Step 3 구현 완료: Full CRUD & UX

`.env.example`을 `.env.local`로 복사하고 `API_BASE_URL=http://127.0.0.1:3000`을 설정한 뒤 `npm run dev`를 실행합니다. http://localhost:3000/posts 에서 게시판을 확인합니다. 다른 포트로 실행하면 환경변수의 포트도 맞추고 서버를 재시작하세요. 주소는 `/api/posts` 경로를 제외한 서버 원점입니다.

- `/posts`: 제목 검색 및 페이지 이동 (`?q=검색어&page=2`), 페이지당 10개 표시
- `/posts/[id]`: 게시글 상세 화면과 존재하지 않는 게시글 안내
- `/posts/[id]/edit`: 서버에서 기존 글을 조회하고 관리 토큰으로 수정
- `/posts/new`: 제목·내용 검증 후 POST 요청, 성공 시 목록으로 이동 (작성 자체는 조회수에 포함하지 않음)
- `/`: `/posts`로 이동

`src/app/layout.tsx`에서 공통 Header와 Navigation을 구성하고 페이지 이동에는 Next.js `Link`를 사용합니다. Function Component와 TSX를 사용하며, 공통 UI는 `src/components`, 요청·응답 타입은 `src/types/post.ts`, API 호출은 `src/services/postApi.ts`, 입력 검증은 `src/lib/postValidation.ts`에 분리했습니다. `src/data/mockPosts.ts`는 Step 1 참고용이며 현재 화면에서는 사용하지 않습니다.

목록·상세·수정 페이지의 데이터는 Server Component에서 `API_BASE_URL`의 절대 URL로 조회합니다. `connection()`으로 요청 시 렌더링하고 `cache: 'no-store'`를 지정하여 빌드 중 API 호출을 방지하고 최신 데이터를 조회합니다. 검색·페이지 이동은 URL의 검색 매개변수를 서버에서 읽어 API에 전달합니다. 검색하면 1페이지부터 표시하며, 잘못된 페이지는 1페이지로 처리하고 범위를 초과한 페이지는 마지막 페이지로 이동합니다. 검색 폼은 `next/form`, 페이지 이동은 `Link`를 사용합니다.

Client Component 폼과 관리 버튼은 같은 출처의 `/api/posts` 및 `/api/posts/:id`로 POST·PATCH·DELETE를 전송합니다. 수정·삭제 시 저장된 `editToken`을 `Authorization: Bearer <editToken>`으로 전달하고 최종 권한은 백엔드가 확인합니다. 토큰이 없는 브라우저에서는 수정·삭제 컨트롤과 수정 폼을 사용할 수 없으며 안내를 표시합니다. 잘못된 토큰의 403 등 API 오류는 화면에 표시합니다. 상세·수정 데이터 조회는 항상 `?view=0`으로 조회수를 올리지 않습니다. 삭제는 화면에서 한 번 더 확인하며, 204 응답은 JSON으로 파싱하지 않습니다. 제공된 CRUD 백엔드 원본은 유지하고 방문 기록용 API를 별도로 추가했습니다.

### 조회수: 브라우저의 실제 상세 화면 진입

상세 데이터 조회와 방문 기록을 분리했습니다. `PostVisitProvider`는 공통 레이아웃에서 현재 경로의 진입 ID를 관리하고, 상세 화면의 `PostViewCounter`는 화면이 실제로 표시될 때 `POST /api/posts/:id/visits`로 방문을 기록합니다.

- 최초 진입, 새로고침, 목록·다른 글·수정 화면에서 상세로 재진입하면 각각 1회 증가합니다. 뒤로가기·앞으로가기 및 브라우저 문서 캐시(BFCache) 복원도 재진입으로 처리합니다.
- 새 글 작성 성공 후에는 상세가 아닌 목록으로 이동하므로 조회수 0을 유지합니다. 이후 목록에서 글을 처음 열면 1이 됩니다.
- 사전 로딩, 서버 렌더링, 수정 화면 조회, `router.refresh()`, 같은 화면의 단순 재렌더링은 증가하지 않습니다. 탭을 잠깐 숨겼다가 다시 보여 주는 것도 새 방문으로 세지 않습니다.
- 개발 모드 Effect 재실행·동시 요청·실패 후 재시도에는 같은 방문 ID를 사용합니다. SQLite `post_visits`의 `(postId, visitId)` 유일 키와 트랜잭션으로 1회만 증가시키며, 중복 방지는 서버 재시작 후에도 유지됩니다.
- 방문 기록 성공 후 표시된 숫자와 목록 캐시를 갱신합니다. 기록 실패 시 다시 시도할 수 있으며 같은 방문 ID로 요청하여 중복 증가를 방지합니다.

이 숫자는 방문 횟수이며 사람별 순 방문자 수가 아닙니다. JavaScript가 실행되어 화면이 표시되고 방문 기록 요청이 성공한 경우를 집계합니다. 기존 누적 조회수는 초기화하지 않았습니다. 제공된 기존 상세 API는 호환성을 위해 원래 동작을 유지하므로 외부에서 `?view=0` 없이 직접 호출하면 여전히 증가합니다. 이 프런트엔드에서는 해당 방식으로 조회하지 않습니다.

앞뒤 공백 제거 후 제목 1~100자·본문 1~5000자를 검사합니다. 제출 중 중복 요청을 막고 실패하면 입력값을 유지하며 오류를 표시합니다. 요청 시간 제한은 10초이며, POST 연결 실패 시 저장 여부가 불확실할 수 있어 목록에서 먼저 확인하도록 안내합니다. 발급된 관리 토큰은 `localStorage`의 `post:<id>:editToken`에 저장합니다. 저장이 차단된 경우 이미 등록된 글을 다시 제출하지 않고 안내와 상세 링크를 표시합니다.

작성·삭제 성공 후 목록으로, 수정 성공 후 상세 화면으로 이동합니다. 변경 성공 후 프런트엔드 Server Action(`src/app/posts/actions.ts`)이 `revalidatePath`로 목록과 해당 상세·수정 경로를 갱신합니다. API의 인증·변경 동작은 이 Action에 옮기지 않았습니다. 데이터 조회와 목록·검색·페이지 UI는 Server Component를 유지하고, 폼·관리 버튼·현재 메뉴 표시·재시도·브라우저 방문 기록만 Client Component로 분리했습니다.

`src/app/posts/loading.tsx`는 로딩 상태를, `error.tsx`는 예상하지 못한 렌더링 오류와 `retry()`를 제공합니다. API 요청 실패는 별도 재시도 UI로 표시합니다. 루트 `not-found.tsx`는 없는 페이지를, `[id]/not-found.tsx`는 없는 상세·수정 글을 안내합니다. 빈 목록과 검색 결과 없음도 구분합니다. 상세·수정 링크는 `prefetch={false}`로 조회수의 사전 증가를 방지합니다. 반응형 스타일은 `src/app/globals.css`에 있습니다.

검증 명령: `npm test` (서비스 계약·오류·검증 테스트), `npm run build` (프로덕션 빌드 및 TypeScript 검사).

실제 API 통합 검증은 빌드 후 `node tests/integration.cjs`로 실행합니다. 비어 있는 3100 포트에서 서버를 시작해 CRUD, 토큰 누락 401·다른 글 토큰 403, SSR·사전 로딩·수정 폼의 조회수 유지, 방문 기록·동시 중복 요청·서버 재시작 후 중복 방지, 제목 검색·검색 결과 없음·페이지 이동, 404, API 연결 실패 안내를 확인합니다. 테스트가 생성한 글과 서버는 검증 후 정리하며 기존 글은 변경하지 않습니다. `npm test`에는 방문 ID가 재렌더링에서 유지되고 상세 재진입·문서 복원에서 바뀌는 단위 테스트도 포함합니다.

## 기존 백엔드 실습 안내

Node.js 24 LTS 환경에서 압축을 풀고 package.json이 있는 폴더에서 `npm ci`, `npm run dev`를 실행하세요. http://localhost:3000/api/posts 에서 빈 목록이 보이면 준비되었습니다. SQLite 파일은 첫 요청 때 data/에 생성되며 재시작 후에도 유지됩니다.

## API 명세
요청 본문은 application/json입니다. 게시글 요약은 id(number), title(string), author("익명"), createdAt(UTC ISO 문자열), views(number)로 구성됩니다. 상세 게시글에는 content(string)가 추가됩니다.

|요청|입력|성공 응답|
|---|---|---|
|GET /api/posts|q(제목 부분 검색), page(기본 1), size(기본 10, 최대 50)|200 {posts: 요약 배열, total, page, size}, 최신순|
|POST /api/posts|{"title":"첫 글","content":"반갑습니다"}|201 {post: 상세 게시글, editToken: 문자열}|
|GET /api/posts/:id|상세 조회 시 조회수 1 증가. 수정 폼에서는 ?view=0 사용|200 상세 게시글|
|POST /api/posts/:id/visits (추가)|{"visitId":"UUID v4"}, 같은 글·방문 ID 중복 기록 방지|200 {views: 누적 조회수}|
|PATCH /api/posts/:id|관리 토큰 및 title, content 모두 전달|200 수정된 상세 게시글|
|DELETE /api/posts/:id|관리 토큰|204 빈 본문|

작성 응답의 editToken을 브라우저에 글 ID별로 보관하고 PATCH와 DELETE 요청에 `Authorization: Bearer <editToken>` 헤더를 전달하세요. 토큰은 작성 응답에서 한 번만 발급합니다. 서버는 해시값을 저장합니다.

입력 양끝 공백을 제거한 뒤 제목 1~100자, 본문 1~5000자(JS 문자열 길이)를 허용합니다. 오류 응답은 {message: 문자열}입니다. 입력 오류는 400, 토큰 누락·형식 오류는 401, 다른 글의 토큰은 403, 없는 글은 404입니다. DELETE 성공 시 JSON 파싱을 생략하세요.

## 학생 실습 (60~90분)
1. Mock 데이터로 src/app/posts 아래에 목록, [id] 상세, new 페이지를 만들고 Link와 공통 레이아웃을 연결하세요.
2. .env.example을 .env.local로 복사하고 실행 포트에 맞게 주소를 설정하세요. src/types/post.ts에서 계약을 정의하고 src/services/postApi.ts에서 API 호출을 구현하세요. Server Component는 API_BASE_URL을 사용해 절대 URL로 조회하고 Client Component의 폼은 같은 출처의 /api/posts로 제출하세요. 빌드 시 서버가 실행되지 않아도 되도록 조회 페이지는 동적 렌더링하고 fetch에는 cache: 'no-store'를 지정하세요.
3. [id]/edit, 삭제, 검색과 페이지 이동을 구현하세요. 제출 중 버튼을 비활성화하고 성공 후 이동 및 화면 갱신을 처리하세요. loading.tsx, error.tsx, not-found.tsx와 빈 목록 안내를 작성하세요. 조회수 증가를 사용하므로 상세 Link에는 prefetch={false}를 지정하세요.

완료 후 다른 글의 토큰으로 수정을 시도해 403을 확인하고, 올바른 토큰으로 삭제한 뒤 목록과 상세 화면을 확인하세요.
