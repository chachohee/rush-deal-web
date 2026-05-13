# ⏰ Rush Deal — Frontend

> MSA 기반 실시간 타임딜 이커머스 플랫폼의 Next.js 프론트엔드

**백엔드 레포지토리 →** [chachohee/rush-deal](https://github.com/chachohee/rush-deal)

---

## 📌 프로젝트 소개

한정된 시간과 수량 안에서 주문이 집중되는 타임딜 커머스 서비스의 클라이언트입니다.
대기열 진입부터 주문·결제까지 이어지는 흐름을 구현하며, 역할(USER / SELLER / MASTER)에 따라 다른 UI를 제공합니다. 검색·알림·관심 등록 등 사용자 funnel을 강화하는 기능도 함께 제공합니다.

---

## 🔑 주요 기능

### 모든 사용자 (비회원 포함)
| 기능 | 설명 |
|------|------|
| 타임딜 목록 | 상태 필터(전체 / 진행중 / 진행예정 / 마감)별 카드 조회. 비로그인도 열람 가능 |
| 타임딜 상세 | 할인가·제한 수량 확인 |
| 통합 검색 | 헤더 검색바 + 자동완성 드롭다운(키보드 ↑↓/Enter), Elasticsearch nori 기반. 결과 카드에 매칭 필드(제목/상품명/회사명)와 `<mark>` 하이라이트 표시 |
| 관심 등록 유도 | 비회원이 하트 아이콘 클릭 시 회원가입 페이지로 안내 |

### 일반 회원 (USER)
| 기능 | 설명 |
|------|------|
| 대기열 | Redis Sorted Set 기반 대기 순위 확인 → 활성화 시 주문 |
| 주문 | 주문 목록·상세 조회, 취소 및 구매확정 |
| 마이페이지 | 프로필 조회·수정, 비밀번호 변경(보기 토글), 배송지 관리(추가·수정·삭제·기본 설정), 보유 포인트 |
| 관심 타임딜 | 카드 하트 아이콘으로 토글(optimistic update), `/interested`에서 관심 목록 확인 |
| 실시간 알림 | 헤더 종 아이콘 + 미읽음 배지. STOMP WebSocket으로 즉시 푸시(주문 접수·결제 완료·취소·계정 변경·타임딜 시작·종료 임박·매진 등 14종) |

### 판매자 (SELLER)
| 기능 | 설명 |
|------|------|
| 상품 관리 | 상품 등록·수정·비활성화·삭제 (사이즈/색상 옵션 포함) |
| 타임딜 관리 | 타임딜 등록·수정 (SCHEDULED 상태만 수정 가능) |
| 셀러 알림 | 본인 타임딜 시작·종료 임박·매진을 알림으로 수신 |

### 관리자 (MASTER)
| 기능 | 설명 |
|------|------|
| 유저 관리 | 회원 목록(상태 컬럼: 정상/정지/삭제됨, 가입일), 우측 드로어 패널에서 역할 변경·정지/해제·삭제 |
| 타임딜 관리 | 전체 타임딜 조회 및 강제 종료, 드로어 패널에서 상품 목록(상품명·옵션·판매 상태) 확인 |
| 대기열 정책 | 정책 생성(타임딜 선택 시 자동 입력), 조회·수정·삭제. STOPPED 정책에 대한 upsert 처리 |
| 상품 관리 | 모든 셀러의 상품 활성화/비활성화/삭제 |
| 감사 로그 | 정지/해제/역할변경/삭제 이력 + 관리자·대상 이메일 enrichment, 액션·기간·이메일 필터 |
| 통합 검색 | 모든 탭에서 검색 항목 드롭다운 + 기간 from-to + 액션 필터 + 검색 버튼 |

---

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| 상태 관리 | Zustand (auth, persist), TanStack Query v5 (서버 상태) |
| 폼 | react-hook-form + Zod v4 |
| HTTP | Axios (JWT 인터셉터, Next.js rewrites BFF 프록시) |
| 실시간 | @stomp/stompjs (WebSocket / STOMP) |
| 결제 | @portone/browser-sdk |
| 테마 | next-themes (라이트/다크) |

---

## 🏗 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/                # 로그인 (비밀번호 보기 토글)
│   │   └── signup/               # 회원가입 (USER / SELLER 역할 선택)
│   └── (main)/
│       ├── timedeals/            # 타임딜 목록 · 상세
│       ├── search/               # 검색 결과 페이지 (하이라이트 + 매칭 필드 표시)
│       ├── interested/           # 내가 관심 등록한 타임딜
│       ├── orders/               # 주문 목록 · 상세
│       ├── mypage/               # 마이페이지 (프로필 · 배송지 · 포인트)
│       ├── admin/                # 관리자 페이지 (탭: 유저·타임딜·정책·상품·감사 로그)
│       └── seller/
│           ├── products/         # 상품 등록 · 수정
│           └── timedeals/        # 타임딜 등록 · 수정
├── components/
│   ├── layout/
│   │   ├── Header.tsx            # 로고·네비·검색바·알림·테마·로그인
│   │   └── SearchBox.tsx         # 검색 입력 + 자동완성 드롭다운
│   ├── notification/
│   │   └── NotificationBell.tsx  # 종 아이콘 + 드롭다운 + STOMP 클라이언트
│   ├── timedeal/
│   │   ├── TimeDealCard.tsx      # 카드 (관심 토글 우상단)
│   │   └── InterestToggle.tsx    # 하트 토글 (비회원은 회원가입 유도)
│   └── ui/
│       ├── PasswordInput.tsx     # 보기 토글 공용 입력
│       ├── ThemeToggle.tsx
│       └── Toast.tsx
├── lib/
│   └── axios.ts                  # JWT 인터셉터(이미 헤더가 있으면 보존), BFF 프록시
└── store/
    └── authStore.ts              # Zustand 인증 상태 (persist)
```

---

## ▶️ 로컬 실행 방법

**사전 준비:** 백엔드([rush-deal](https://github.com/chachohee/rush-deal))가 `http://localhost:8080`에서 실행 중이어야 합니다.

### 1. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 항목:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_PORTONE_STORE_ID=<PortOne store id>
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=<PortOne channel key>
```

### 2. 의존성 설치 및 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3001` 접속

---

## 🔐 인증 & 통신

- **JWT 흐름**: 로그인 시 서버에서 `accessToken`(JWT)만 반환 → JWT payload에서 role 추출 후 `/api/v1/users/me`로 사용자 정보 조회 → Zustand `persist`로 localStorage에 보관
- **Axios 인터셉터**: 요청마다 `Authorization: Bearer <token>` 자동 주입. **이미 헤더가 명시된 요청은 덮어쓰지 않음** (이전 세션의 만료 토큰이 신규 로그인 직후 호출을 오염시키지 않도록)
- **401 처리**: 응답이 401이면 자동 로그아웃 + `/login` 리다이렉트
- **CORS**: Next.js `rewrites`로 `/api/*` → `NEXT_PUBLIC_API_URL` 프록시 (BFF 패턴)

## 📡 실시간 알림

- **STOMP over WebSocket**: 로그인 상태에서 `ws://<API_URL>/api/v1/notifications/ws` 자동 연결
- **인증**: STOMP CONNECT 헤더에 JWT 첨부 → 서버 ChannelInterceptor가 검증 후 사용자 식별
- **구독 채널**: `/user/queue/notifications` (서버가 사용자별로 라우팅)
- **반영 방식**: 새 알림 수신 시 React Query 캐시를 invalidate해 카운트 배지 + 드롭다운 즉시 갱신
- **폴백**: WS 미연결 시에도 60초마다 미읽음 카운트를 자동 새로고침

## 🔍 검색

- 헤더 검색바에 입력하면 200ms debounce로 `/api/v1/timedeals/search/suggest` 호출 → 자동완성 드롭다운 표시 (키보드 ↑↓/Enter, Esc로 닫기)
- 검색 결과 페이지 `/search?q=...`에서는 카드 아래에 매칭된 필드명(타임딜명/상품명/회사명/설명)과 `<mark>` 하이라이트 스니펫 표시

---

## 🧑‍🤝‍🧑 팀원

| 이름 | 담당 |
|------|------|
| [차초희](https://github.com/chachohee) | 프론트엔드 전체 |

백엔드 팀원 → [rush-deal README 참고](https://github.com/chachohee/rush-deal#-%ED%8C%80%EC%9B%90-%EB%B0%8F-%EC%97%AD%ED%95%A0)
