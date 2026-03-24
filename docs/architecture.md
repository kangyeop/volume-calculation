# 시스템 아키텍처

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 패키지 매니저 | pnpm |
| 프레임워크 | Next.js 15 (App Router) |
| 런타임 | Node.js 18+ |
| 데이터베이스 | Supabase PostgreSQL |
| ORM | Drizzle ORM |
| 프론트엔드 | React 19, TailwindCSS, Radix UI |
| 상태 관리 | TanStack React Query, Jotai |
| 엑셀 처리 | ExcelJS, SheetJS (xlsx) |
| HTTP 클라이언트 | Axios |
| 파일 저장소 | Supabase Storage |
| 인증 | Supabase Auth + @supabase/ssr |
| 아이콘 | Lucide React |
| 토스트 | Sonner |

## 디렉토리 구조

```
volume-calculator/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # 루트 레이아웃 (Providers 래핑)
│   │   ├── page.tsx                  # 랜딩 페이지
│   │   ├── providers.tsx             # QueryClient, ErrorBoundary, Toaster
│   │   ├── globals.css               # TailwindCSS 전역 스타일
│   │   │
│   │   ├── login/                    # 로그인 페이지
│   │   ├── auth/callback/            # OAuth 콜백 라우트
│   │   │
│   │   ├── (main)/                   # 메인 레이아웃 그룹 (사이드바 포함)
│   │   │   ├── layout.tsx            # 사이드바 + 메인 컨텐츠 레이아웃
│   │   │   ├── products/             # 상품 관리 페이지
│   │   │   ├── shipments/            # 출고 관리 페이지
│   │   │   └── boxes/                # 박스 관리 페이지
│   │   │
│   │   └── api/                      # API Route Handlers
│   │       ├── product-groups/       # 상품 그룹 CRUD
│   │       ├── products/             # 상품 개별 수정/삭제
│   │       ├── box-groups/           # 박스 그룹 CRUD
│   │       ├── boxes/                # 박스 CRUD + 엑셀 업로드
│   │       ├── shipments/            # 출고(Shipment) 관리
│   │       │   └── [shipmentId]/
│   │       │       ├── confirm/      # 패킹 확정/해제
│   │       │       ├── order-items/  # 주문 아이템(OrderItem) CRUD
│   │       │       ├── orders/       # 주문별 상품 매핑, 부피 계산
│   │       │       └── packing/      # 패킹 계산, 결과, 내보내기
│   │       ├── order-items/          # 주문 아이템 개별 조작
│   │       ├── upload/               # 출고 엑셀 업로드
│   │       ├── product-upload/       # 상품 엑셀 업로드
│   │       ├── projects/             # 프로젝트 CRUD + 통계
│   │       └── dashboard/            # 대시보드 통계
│   │
│   ├── components/                   # React UI 컴포넌트
│   │   ├── layout/                   # 레이아웃 (GlobalLayout, Sidebar, ProjectLayout)
│   │   ├── ui/                       # 공통 UI (table, tabs, collapsible, loading-spinner)
│   │   ├── packing/                  # 패킹 관련 컴포넌트
│   │   ├── products/                 # 상품 관련 컴포넌트
│   │   ├── ErrorBoundary.tsx         # 에러 바운더리
│   │   ├── ExcelUpload.tsx           # 엑셀 업로드 공통 컴포넌트
│   │   ├── PackingResult.tsx         # 패킹 결과 표시
│   │   ├── skeletons.tsx             # 로딩 스켈레톤
│   │   └── Toaster.tsx               # 토스트 알림
│   │
│   ├── hooks/                        # 커스텀 React 훅
│   │   ├── queries/                  # React Query 훅 (서버 상태)
│   │   │   ├── index.ts              # 쿼리 훅 배럴 export
│   │   │   ├── queryKeys.ts          # 쿼리 키 팩토리
│   │   │   ├── useBoxGroups.ts
│   │   │   ├── useBoxes.ts
│   │   │   ├── useShipments.ts
│   │   │   ├── useOrderItems.ts
│   │   │   ├── usePacking.ts
│   │   │   ├── useProductGroups.ts
│   │   │   ├── useProducts.ts
│   │   │   └── useProjects.ts
│   │   ├── useShipmentFilters.ts     # 출고 필터링
│   │   ├── useShipmentUploadFlow.ts  # 출고 업로드 플로우 관리
│   │   ├── usePackingNormalizer.ts   # 패킹 데이터 정규화
│   │   ├── usePrefetch.ts            # 데이터 프리페치
│   │   ├── useProductFilters.ts      # 상품 필터링
│   │   ├── useProductUpload.ts       # 상품 업로드 플로우
│   │   ├── useUploadState.ts         # 업로드 상태 관리
│   │   ├── useExcelDateConversion.ts # 엑셀 날짜 변환
│   │   ├── useRetry.ts              # 재시도 로직
│   │   └── useToast.tsx             # 토스트 훅
│   │
│   ├── lib/                          # 서버/공통 라이브러리
│   │   ├── api.ts                    # API 클라이언트 (Axios)
│   │   ├── utils.ts                  # 유틸리티 (cn 등)
│   │   ├── db/
│   │   │   └── schema.ts            # Drizzle ORM 스키마 정의
│   │   ├── supabase/
│   │   │   ├── client.ts            # Supabase 브라우저 클라이언트 (쿠키 기반)
│   │   │   ├── server.ts            # Supabase 서버 클라이언트 + Admin 클라이언트
│   │   │   └── middleware.ts        # 미들웨어 세션 갱신 헬퍼
│   │   ├── algorithms/
│   │   │   └── packing.ts           # 패킹 알고리즘
│   │   ├── services/                 # 비즈니스 로직 서비스
│   │   │   ├── products.ts
│   │   │   ├── product-groups.ts
│   │   │   ├── product-upload.ts    # 상품 엑셀 업로드
│   │   │   ├── boxes.ts
│   │   │   ├── box-groups.ts
│   │   │   ├── projects.ts
│   │   │   ├── shipment.ts           # 출고(Shipment) CRUD
│   │   │   ├── shipments.ts          # Shipment 목록 조회
│   │   │   ├── orders.ts             # Order 서비스
│   │   │   ├── order-item.ts        # 주문 아이템(OrderItem) CRUD
│   │   │   ├── dashboard.ts          # 대시보드 통계
│   │   │   ├── file-storage.ts       # 파일 저장소 (Supabase Storage)
│   │   │   ├── upload.ts            # 출고 업로드 핵심 로직
│   │   │   ├── format-parser.ts    # 고정 양식 파서 (정산/매핑전/매핑후)
│   │   │   └── excel.ts             # 엑셀 파싱/생성
│   │
│   └── types/                        # TypeScript 타입 정의
│       └── index.ts                  # 주요 도메인 타입
│
├── drizzle.config.ts                 # Drizzle Kit 설정
├── next.config.ts                    # Next.js 설정
├── tailwind.config.ts                # TailwindCSS 설정
├── tsconfig.json                     # TypeScript 설정
└── package.json
```

## 아키텍처 다이어그램

### 전체 시스템 구성

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│  ┌───────────────────────────────────────────────┐  │
│  │           React 19 + TailwindCSS              │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │ Products │ │ Outbound │ │    Boxes      │  │  │
│  │  │  Pages   │ │  Pages   │ │    Pages      │  │  │
│  │  └────┬─────┘ └────┬─────┘ └──────┬────────┘  │  │
│  │       │             │              │           │  │
│  │  ┌────▼─────────────▼──────────────▼────────┐  │  │
│  │  │  React Query (서버 상태) + Jotai (UI 상태) │  │  │
│  │  └────────────────┬─────────────────────────┘  │  │
│  │                   │                            │  │
│  │  ┌────────────────▼─────────────────────────┐  │  │
│  │  │         API Client (Axios)               │  │  │
│  │  └────────────────┬─────────────────────────┘  │  │
│  └───────────────────┼───────────────────────────┘  │
└──────────────────────┼──────────────────────────────┘
                       │ HTTP
┌──────────────────────┼──────────────────────────────┐
│              Next.js 15 Server                      │
│  ┌─────────────────────────────────────────────┐    │
│  │      Middleware (세션 갱신 + 라우트 보호)     │    │
│  └──────────────────┬──────────────────────────┘    │
│  ┌───────────────────▼─────────────────────────┐    │
│  │         API Route Handlers                  │    │
│  │    /api/product-groups, /api/boxes,          │    │
│  │    /api/shipments, /api/upload, ...          │    │
│  └──────┬──────────┬───────────────┬───────────┘    │
│         │          │               │                │
│  ┌──────▼───┐ ┌──────▼──────────┐                    │
│  │ Services │ │   Algorithms    │                    │
│  │ (CRUD)   │ │   (Packing)     │                    │
│  └──────┬───┘ └─────────────────┘                    │
│         │                                           │
│  ┌──────▼──────────────────────────────────────┐    │
│  │         Drizzle ORM                         │    │
│  └──────────────────┬──────────────────────────┘    │
└─────────────────────┼───────────────────────────────┘
                      │ TCP
┌─────────────────────┼───────────────────────────────┐
│           Supabase (클라우드)                         │
│  ┌──────────────────▼──────────────────────────┐    │
│  │            PostgreSQL                       │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │         Supabase Storage (파일)              │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 서버 레이어 구조

```
API Route Handler
       │
       ▼
    Service          ←── 비즈니스 로직
       │
       ├──→ Drizzle ORM ──→ Supabase PostgreSQL
       │
       ├──→ ExcelJS / xlsx ──→ 엑셀 파싱/생성
       │
       └──→ Supabase Client ──→ Supabase Storage
```

## 프론트엔드 라우트

| 경로 | 기능 |
|------|------|
| `/login` | 로그인 페이지 |
| `/auth/callback` | OAuth 콜백 |
| `/` | 랜딩 페이지 |
| `/products` | 상품 그룹 목록 |
| `/products/new` | 새 상품 그룹 생성 |
| `/products/[id]` | 상품 그룹 상세 (상품 목록, 엑셀 업로드) |
| `/shipments` | 출고 목록, 엑셀 업로드 |
| `/shipments/new` | 새 출고 생성 |
| `/shipments/[id]` | 출고 상세 (주문/아이템 목록) |
| `/shipments/[id]/packing` | 패킹 계산 및 결과 |
| `/boxes` | 박스 그룹 목록 |
| `/boxes/new` | 새 박스 그룹 생성 |
| `/boxes/[id]` | 박스 그룹 상세 (박스 목록) |

## 상태 관리

| 레이어 | 기술 | 용도 |
|--------|------|------|
| 서버 상태 | TanStack React Query | API 데이터 캐싱, 동기화 |
| 클라이언트 상태 | Jotai | UI 상태 (필터, 모달 등) |
| 쿼리 키 | `@lukemorales/query-key-factory` | 타입 안전한 쿼리 키 관리 |

React Query 설정: `staleTime: 5분`, `refetchOnWindowFocus: false`, `retry: 1`

## 환경 변수

| 변수 | 용도 |
|------|------|
| `DATABASE_URL` | Drizzle ORM PostgreSQL 연결 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Publishable 키 (anon 대체) |
| `SUPABASE_SECRET_KEY` | Supabase Secret 키 (service_role 대체, 서버 전용) |
