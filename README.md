# ⏰ Rush Deal — Frontend

> MSA 기반 실시간 타임딜 이커머스 플랫폼의 Next.js 프론트엔드

**백엔드 레포지토리 →** [chachohee/rush-deal](https://github.com/chachohee/rush-deal)

---

## 📌 프로젝트 소개

한정된 시간과 수량 안에서 주문이 집중되는 타임딜 커머스 서비스의 클라이언트입니다.  
대기열 진입부터 주문·결제까지 이어지는 흐름을 구현하며, 역할(USER / SELLER / MASTER)에 따라 다른 UI를 제공합니다.

---

## 🔑 주요 기능

### 일반 회원 (USER)
| 기능 | 설명 |
|------|------|
| 타임딜 목록 | 상태 필터(진행중 / 진행예정 / 마감)별 타임딜 카드 조회 |
| 타임딜 상세 | 할인가·제한 수량 확인 및 대기열 진입 |
| 대기열 | Redis Sorted Set 기반 대기 순위 확인 → 활성화 시 주문 |
| 주문 | 주문 목록·상세 조회, 취소 및 구매확정 |
| 마이페이지 | 프로필 조회·수정, 비밀번호 변경, 배송지 관리 (추가·수정·삭제·기본 설정) |

### 판매자 (SELLER)
| 기능 | 설명 |
|------|------|
| 상품 관리 | 상품 등록·수정·비활성화·삭제 (사이즈/색상 옵션 포함) |
| 타임딜 관리 | 타임딜 등록·수정 (SCHEDULED 상태만 수정 가능) |

### 관리자 (MASTER)
| 기능 | 설명 |
|------|------|
| 유저 관리 | 전체 회원 목록 및 역할 조회 |
| 타임딜 관리 | 전체 타임딜 조회 및 강제 종료 |
| 대기열 정책 | 대기열 정책 조회·삭제 |

---

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| 상태 관리 | Zustand (auth), TanStack Query v5 (서버 상태) |
| 폼 | react-hook-form + Zod v4 |
| HTTP | Axios (JWT 인터셉터, Next.js rewrites BFF 프록시) |

---

## 🏗 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/          # 로그인
│   │   └── signup/         # 회원가입 (USER / SELLER 역할 선택)
│   └── (main)/
│       ├── timedeals/      # 타임딜 목록 · 상세
│       ├── orders/         # 주문 목록 · 상세
│       ├── mypage/         # 마이페이지
│       ├── admin/          # 관리자 페이지 (MASTER 전용)
│       └── seller/
│           ├── products/   # 상품 목록 · 등록 · 수정
│           └── timedeals/  # 타임딜 목록 · 등록 · 수정
├── components/
│   ├── layout/             # Header, Providers
│   └── timedeal/           # TimeDealCard
├── lib/
│   └── axios.ts            # JWT 인터셉터, BFF 프록시
└── store/
    └── authStore.ts        # Zustand 인증 상태 (persist)
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
```

### 2. 의존성 설치 및 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3001` 접속

---

## 🔐 인증 방식

- 로그인 시 서버에서 `accessToken`(JWT)만 반환
- 클라이언트에서 JWT를 디코딩해 role 추출 → `/api/v1/users/me`로 사용자 정보 조회
- Zustand `persist`로 인증 상태 유지 (localStorage)
- Axios 인터셉터로 모든 요청에 `Authorization: Bearer <token>` 자동 주입
- 401 응답 시 자동 로그아웃 및 `/login` 리다이렉트
- Next.js `rewrites`를 BFF 프록시로 활용해 CORS 우회

---

## 🧑‍🤝‍🧑 팀원

| 이름 | 담당 |
|------|------|
| [차초희](https://github.com/chachohee) | 프론트엔드 전체 |

백엔드 팀원 → [rush-deal README 참고](https://github.com/chachohee/rush-deal#-%ED%8C%80%EC%9B%90-%EB%B0%8F-%EC%97%AD%ED%95%A0)
