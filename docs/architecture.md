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
│   │   │   ├── settlements/          # 정산 관리 페이지 (목록, 업로드, 상세)
│   │   │   ├── estimates/             # 견적서 관리 페이지 (목록, PDF 뷰어)
│   │   │   ├── boxes/                # 박스 독립 목록 페이지
│   │   │   └── box-groups/           # 박스 그룹 관리 페이지
│   │   │
│   │   └── api/                      # API Route Handlers
│   │       ├── product-groups/       # 상품 그룹 CRUD
│   │       ├── products/             # 상품 개별 수정/삭제
│   │       ├── box-groups/           # 박스 그룹 CRUD + 박스 배정
│   │       ├── boxes/                # 박스 독립 CRUD + 엑셀 업로드 + 미배정 조회
│   │       ├── shipments/            # 출고(Shipment) 관리
│   │       │   └── [shipmentId]/
│   │       │       ├── confirm/      # 패킹 확정/해제
│   │       │       ├── order-items/  # 주문 아이템(OrderItem) CRUD
│   │       │       ├── orders/       # 주문별 상품 매핑, 부피 계산
│   │       │       └── packing/      # 패킹 계산, 결과, 내보내기
│   │       ├── settlements/          # 정산(Settlement) 관리
│   │       │   └── [id]/
│   │       │       ├── assign-box/   # 수동 박스 배정
│   │       │       └── confirm/      # 정산 확정/해제
│   │       ├── estimates/             # 견적서 CRUD + PDF 업로드 + Signed URL
│   │       │   └── [id]/
│   │       │       └── signed-url/   # PDF signed URL 발급
│   │       ├── order-items/          # 주문 아이템 개별 조작
│   │       ├── upload/               # 출고 및 정산 엑셀 업로드
│   │       │   ├── shipment/         # 출고 엑셀 업로드
│   │       │   └── settlement/       # 정산 엑셀 업로드
│   │       ├── product-upload/       # 상품 엑셀 업로드
│   │       ├── projects/             # 프로젝트 CRUD + 통계
│   │       └── dashboard/            # 대시보드 통계
│   │
│   ├── components/                   # React UI 컴포넌트
│   │   ├── layout/                   # 레이아웃 (GlobalLayout, Sidebar, ProjectLayout)
│   │   ├── ui/                       # 공통 UI (table, tabs, collapsible, loading-spinner, status-badge)
│   │   ├── batch/                    # 출고/정산 공통 컴포넌트 (BatchListPage, ConfigurationList, SummaryStatCard)
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
│   │   │   ├── useBoxStockHistories.ts
│   │   │   ├── useShipments.ts
│   │   │   ├── useEstimates.ts       # 견적서 쿼리 훅
│   │   │   ├── useSettlements.ts     # 정산 쿼리 훅
│   │   │   ├── useOrderItems.ts
│   │   │   ├── usePacking.ts
│   │   │   ├── useProductGroups.ts
│   │   │   ├── useProducts.ts
│   │   │   ├── useProjects.ts
│   │   │   ├── useGlobalProductGroups.ts  # 글로벌 상품 그룹 쿼리
│   │   │   ├── useGlobalProducts.ts       # 글로벌 상품 쿼리
│   │   │   ├── useGlobalShipments.ts      # 글로벌 출고 쿼리
│   │   │   └── useGlobalPacking.ts        # 글로벌 팔레트 계산 쿼리
│   │   ├── useShipmentFilters.ts     # 출고 필터링
│   │   ├── useShipmentUploadFlow.ts  # 출고 업로드 플로우 관리
│   │   ├── usePackingNormalizer.ts   # 패킹 데이터 정규화
│   │   ├── usePackingGroups.ts      # 패킹 그룹 로직 (출고/정산 공통)
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
│   │   ├── auth.ts                  # getUserId() — Supabase Auth 기반 인증 헬퍼
│   │   ├── db/
│   │   │   └── schema.ts            # Drizzle ORM 스키마 정의
│   │   ├── supabase/
│   │   │   ├── client.ts            # Supabase 브라우저 클라이언트 (쿠키 기반)
│   │   │   ├── server.ts            # Supabase 서버 클라이언트 + Admin 클라이언트
│   │   │   └── middleware.ts        # 미들웨어 세션 갱신 헬퍼
│   │   ├── algorithms/
│   │   │   ├── packing.ts           # 패킹 알고리즘 (국내 박스)
│   │   │   ├── pallet.ts            # 팔레트 계산 알고리즘 (글로벌)
│   │   │   └── __tests__/
│   │   │       └── pallet.test.ts   # 팔레트 계산 테스트 (Vitest)
│   │   ├── services/                 # 비즈니스 로직 서비스
│   │   │   ├── products.ts
│   │   │   ├── product-groups.ts
│   │   │   ├── product-upload.ts    # 상품 엑셀 업로드
│   │   │   ├── boxes.ts
│   │   │   ├── box-stock-histories.ts
│   │   │   ├── box-groups.ts
│   │   │   ├── projects.ts
│   │   │   ├── shipment.ts           # 출고(Shipment) CRUD
│   │   │   ├── shipments.ts          # Shipment 목록 조회
│   │   │   ├── settlement.ts         # 정산(Settlement) CRUD + 업로드
│   │   │   ├── orders.ts             # Order 서비스
│   │   │   ├── order-item.ts        # 주문 아이템(OrderItem) CRUD
│   │   │   ├── dashboard.ts          # 대시보드 통계
│   │   │   ├── estimates.ts          # 견적서 CRUD + PDF Storage
│   │   │   ├── file-storage.ts       # 파일 저장소 (Supabase Storage)
│   │   │   ├── upload.ts            # 출고 업로드 핵심 로직
│   │   │   ├── format-parser.ts    # 고정 양식 파서 (정산/매핑전/매핑후)
│   │   │   ├── excel.ts             # 엑셀 파싱/생성
│   │   │   ├── global-product-groups.ts  # 글로벌 상품 그룹 CRUD
│   │   │   ├── global-products.ts        # 글로벌 상품 CRUD
│   │   │   ├── global-shipment.ts        # 글로벌 출고 CRUD
│   │   │   ├── global-order-item.ts      # 글로벌 주문 아이템 CRUD
│   │   │   ├── global-format-parser.ts   # 글로벌 엑셀 파서 (v1 placeholder)
│   │   │   ├── global-upload.ts          # 글로벌 출고 업로드 파이프라인
│   │   │   └── global-packing.ts         # 글로벌 팔레트 계산
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
    Service          ←── 비즈니스 로직 (getUserId()로 userId 주입)

       │
       ├──→ Drizzle ORM ──→ Supabase PostgreSQL
       │
       ├──→ ExcelJS / xlsx ──→ 엑셀 파싱/생성
       │
       └──→ Supabase Client ──→ Supabase Storage
```

## 프론트엔드 라우트

### 국내 물류 (Domestic)

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
| `/settlements` | 정산 목록 |
| `/settlements/new` | 정산 엑셀 업로드 |
| `/settlements/[id]` | 정산 상세 (주문/아이템 목록) |
| `/estimates` | 견적서 목록, 검색, PDF 업로드 |
| `/estimates/[id]` | 견적서 PDF 뷰어 |
| `/boxes` | 박스 독립 목록 (미배정 박스 포함) |
| `/box-groups` | 박스 그룹 목록 |
| `/box-groups/new` | 새 박스 그룹 생성 |
| `/box-groups/[id]` | 박스 그룹 상세 (박스 선택·배정) |

### 글로벌 물류 (Global Logistics)

| 경로 | 기능 |
|------|------|
| `/global/products` | 상품 그룹 목록 |
| `/global/products/new` | 새 상품 그룹 생성 (엑셀 업로드 포함) |
| `/global/products/[id]` | 상품 그룹 상세 (상품 목록, 엑셀 업로드) |
| `/global/shipments` | 글로벌 출고 목록, 엑셀 업로드 |
| `/global/shipments/new` | 새 글로벌 출고 생성 |
| `/global/shipments/[id]` | 글로벌 출고 상세 (주문/아이템 목록) |
| `/global/shipments/[id]/packing` | 팔레트 계산 및 결과 |

## API 라우트

### 국내 물류 (Domestic)

| 엔드포인트 | 메서드 | 기능 |
|-----------|--------|------|
| `/api/product-groups` | GET, POST | 상품 그룹 목록·생성 |
| `/api/product-groups/[groupId]` | PATCH, DELETE | 상품 그룹 수정·삭제 |
| `/api/product-groups/[groupId]/products` | GET, POST | 상품 목록·생성 |
| `/api/products/[id]` | PATCH, DELETE | 상품 수정·삭제 |
| `/api/shipments` | GET, POST | 출고 목록·생성 |
| `/api/shipments/[id]` | GET, DELETE | 출고 상세·삭제 |
| `/api/shipments/[id]/packing/calculate` | POST | 패킹 계산 |
| `/api/shipments/[id]/packing/recommendation` | GET | 패킹 결과 조회 |
| `/api/upload/shipment` | POST | 출고 엑셀 업로드 |
| 기타 | - | 박스, 정산, 견적서, 주문 아이템 등 |

### 글로벌 물류 (Global Logistics)

| 엔드포인트 | 메서드 | 기능 |
|-----------|--------|------|
| `/api/global/product-groups` | GET, POST | 글로벌 상품 그룹 목록·생성 |
| `/api/global/product-groups/[groupId]` | PATCH, DELETE | 글로벌 상품 그룹 수정·삭제 |
| `/api/global/product-groups/[groupId]/products` | GET, POST | 글로벌 상품 목록·생성 |
| `/api/global/products/[id]` | PATCH, DELETE | 글로벌 상품 수정·삭제 |
| `/api/global/shipments` | GET, POST | 글로벌 출고 목록·생성 |
| `/api/global/shipments/[id]` | GET, DELETE | 글로벌 출고 상세·삭제 |
| `/api/global/shipments/[id]/packing/calculate` | POST | 팔레트 계산 |
| `/api/global/shipments/[id]/packing/recommendation` | GET | 팔레트 결과 조회 |
| `/api/global/upload/shipment` | POST | 글로벌 출고 엑셀 업로드 |

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
