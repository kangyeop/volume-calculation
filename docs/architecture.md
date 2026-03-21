# 시스템 아키텍처

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 패키지 매니저 | pnpm |
| 프레임워크 | Next.js 15 (App Router) |
| 런타임 | Node.js 18+ |
| 데이터베이스 | Supabase PostgreSQL |
| ORM | Drizzle ORM |
| AI | OpenAI SDK (Structured Output + Zod) |
| 프론트엔드 | React 19, TailwindCSS, Radix UI |
| 상태 관리 | TanStack React Query, Jotai |
| 엑셀 처리 | ExcelJS, SheetJS (xlsx) |
| HTTP 클라이언트 | Axios |
| 파일 저장소 | Supabase Storage |
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
│   │   ├── (main)/                   # 메인 레이아웃 그룹 (사이드바 포함)
│   │   │   ├── layout.tsx            # 사이드바 + 메인 컨텐츠 레이아웃
│   │   │   ├── products/             # 상품 관리 페이지
│   │   │   ├── outbound/             # 출고 관리 페이지
│   │   │   └── boxes/                # 박스 관리 페이지
│   │   │
│   │   └── api/                      # API Route Handlers
│   │       ├── product-groups/       # 상품 그룹 CRUD
│   │       ├── products/             # 상품 개별 수정/삭제
│   │       ├── box-groups/           # 박스 그룹 CRUD
│   │       ├── boxes/                # 박스 CRUD + 엑셀 업로드
│   │       ├── outbound-batches/     # 출고 배치 관리
│   │       │   └── [batchId]/
│   │       │       ├── outbounds/    # 출고 아이템 CRUD
│   │       │       ├── orders/       # 주문별 상품 매핑, 부피 계산
│   │       │       └── packing/      # 패킹 계산, 결과, 내보내기
│   │       ├── outbounds/            # 출고 아이템 개별 조작
│   │       ├── upload/               # 출고 엑셀 업로드 파이프라인
│   │       ├── product-upload/       # 상품 엑셀 업로드 파이프라인
│   │       ├── upload-templates/     # 업로드 템플릿 CRUD
│   │       ├── projects/             # 프로젝트 CRUD + 통계
│   │       └── dashboard/            # 대시보드 통계
│   │
│   ├── components/                   # React UI 컴포넌트
│   │   ├── layout/                   # 레이아웃 (GlobalLayout, Sidebar, ProjectLayout)
│   │   ├── ui/                       # 공통 UI (table, tabs, collapsible, loading-spinner)
│   │   ├── packing/                  # 패킹 관련 컴포넌트
│   │   ├── upload/                   # 업로드 관련 컴포넌트
│   │   ├── ErrorBoundary.tsx         # 에러 바운더리
│   │   ├── ExcelUpload.tsx           # 엑셀 업로드 공통 컴포넌트
│   │   ├── MappingPreview.tsx        # 매핑 미리보기
│   │   ├── PackingResult.tsx         # 패킹 결과 표시
│   │   └── Toaster.tsx               # 토스트 알림
│   │
│   ├── hooks/                        # 커스텀 React 훅
│   │   ├── queries/                  # React Query 훅 (서버 상태)
│   │   │   ├── queryKeys.ts          # 쿼리 키 팩토리
│   │   │   ├── useBoxGroups.ts
│   │   │   ├── useBoxes.ts
│   │   │   ├── useOutboundBatches.ts
│   │   │   ├── useOutbounds.ts
│   │   │   ├── usePacking.ts
│   │   │   ├── useProductGroups.ts
│   │   │   ├── useProducts.ts
│   │   │   ├── useProjects.ts
│   │   │   └── useUpload.ts
│   │   ├── useOutboundFilters.ts     # 출고 필터링
│   │   ├── useOutboundUploadFlow.ts  # 출고 업로드 플로우 관리
│   │   ├── usePackingNormalizer.ts   # 패킹 데이터 정규화
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
│   │   │   └── server.ts            # Supabase Admin 클라이언트
│   │   ├── algorithms/
│   │   │   └── packing.ts           # 패킹 알고리즘
│   │   ├── services/                 # 비즈니스 로직 서비스
│   │   │   ├── products.ts
│   │   │   ├── product-groups.ts
│   │   │   ├── boxes.ts
│   │   │   ├── box-groups.ts
│   │   │   ├── projects.ts
│   │   │   ├── outbound-batch.ts
│   │   │   ├── upload.ts            # 출고 업로드 핵심 로직
│   │   │   ├── upload-session.ts    # 업로드 세션 (DB 기반)
│   │   │   ├── upload-templates.ts  # 템플릿 매칭/저장
│   │   │   ├── data-transformer.ts  # 엑셀 행 → DTO 변환
│   │   │   ├── row-normalizer.ts    # 복합 행 분리
│   │   │   └── excel.ts             # 엑셀 파싱/생성
│   │   ├── schemas/                  # Zod 스키마 (AI Structured Output)
│   │   │   ├── outbound-mapping.ts  # 출고 컬럼 매핑
│   │   │   ├── product-mapping.ts   # 상품 컬럼 매핑
│   │   │   └── product-match.ts     # 상품 매칭 결과
│   │   └── prompts/                  # OpenAI 프롬프트 빌더
│   │       ├── outbound.ts          # 출고 컬럼 매핑 프롬프트
│   │       ├── product.ts           # 상품 컬럼 매핑 프롬프트
│   │       └── matching.ts          # 상품 매칭 프롬프트
│   │
│   └── types/                        # TypeScript 타입 정의
│       ├── index.ts                  # 주요 도메인 타입
│       └── upload.ts                # 업로드 관련 타입
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
│  ┌───────────────────▼─────────────────────────┐    │
│  │         API Route Handlers                  │    │
│  │    /api/product-groups, /api/boxes,          │    │
│  │    /api/outbound-batches, /api/upload, ...   │    │
│  └──────┬──────────┬───────────────┬───────────┘    │
│         │          │               │                │
│  ┌──────▼───┐ ┌────▼─────┐ ┌──────▼──────────┐     │
│  │ Services │ │ AI Layer │ │   Algorithms    │     │
│  │ (CRUD)   │ │ (OpenAI) │ │   (Packing)     │     │
│  └──────┬───┘ └──────────┘ └─────────────────┘     │
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
       ├──→ OpenAI SDK ──→ OpenAI API
       │     (Structured Output + Zod Schema)
       │
       ├──→ ExcelJS / xlsx ──→ 엑셀 파싱/생성
       │
       └──→ Supabase Client ──→ Supabase Storage
```

### AI 파이프라인

```
엑셀 파일 업로드
       │
       ▼
  엑셀 파싱 (ExcelJS)
       │
       ▼
  템플릿 매칭 시도 ──(hit)──→ 저장된 매핑 사용
       │ (miss)
       ▼
  OpenAI Structured Output
  (프롬프트 + Zod 스키마)
       │
       ▼
  컬럼 매핑 결과 반환
       │
       ▼
  사용자 확인/수정
       │
       ▼
  row-normalizer (복합 행 분리)
       │
       ▼
  data-transformer (DTO 변환)
       │
       ▼
  상품 매칭 (OpenAI)
       │
       ▼
  DB 저장 + 템플릿 저장
```

## 데이터베이스 스키마

### ER 다이어그램

```
┌──────────────┐         ┌──────────────┐
│ ProductGroup │ 1 ── N  │   Product    │
│──────────────│         │──────────────│
│ id (PK)      │         │ id (PK)      │
│ name         │         │ sku (UNIQUE) │
│ createdAt    │         │ name         │
│ updatedAt    │         │ width        │
└──────────────┘         │ length       │
                         │ height       │
                         │ productGroupId (FK) │
                         └───────┬──────┘
                                 │ (nullable FK)
┌──────────────┐         ┌──────▼───────┐
│ BoxGroup     │ 1 ── N  │ OutboundItem │
│──────────────│         │──────────────│
│ id (PK)      │         │ id (PK)      │
│ name         │         │ orderId      │
└──────┬───────┘         │ sku          │
       │                 │ quantity     │
┌──────▼───────┐         │ outboundBatchId (FK) │
│    Box       │         │ productId (FK, nullable) │
│──────────────│         └──────┬───────┘
│ id (PK)      │                │
│ name         │         ┌──────▼───────┐
│ width        │         │OutboundBatch │
│ length       │         │──────────────│
│ height       │         │ id (PK)      │
│ price        │         │ name         │
│ boxGroupId (FK) │      │ packingRecommendation (JSONB) │
└──────────────┘         │ lastBoxGroupId │
                         └──┬───┬───┬──┘
                            │   │   │
              ┌─────────────┘   │   └─────────────┐
              ▼                 ▼                  ▼
       ┌──────────┐    ┌──────────────┐   ┌────────────────┐
       │  Order   │    │PackingResult │   │PackingResult   │
       │──────────│    │──────────────│   │Detail          │
       │ id (PK)  │    │ id (PK)      │   │────────────────│
       │ orderId  │    │ boxName      │   │ id (PK)        │
       │ recipient│    │ packedCount  │   │ orderId        │
       │ address  │    │ efficiency   │   │ sku            │
       │ status   │    │ totalCBM     │   │ productName    │
       │ batchId  │    │ groupLabel   │   │ quantity       │
       └──────────┘    │ batchId (FK) │   │ boxName        │
                       └──────────────┘   │ boxNumber      │
                                          │ efficiency     │
                                          │ placements (JSONB) │
                                          │ batchId (FK)   │
                                          └────────────────┘

┌──────────────────┐         ┌──────────────┐
│ UploadTemplate   │         │ UploadSession│
│──────────────────│         │──────────────│
│ id (PK)          │         │ id (PK)      │
│ name             │         │ data (JSONB) │
│ type (enum)      │         │ expiresAt    │
│ headers (JSONB)  │         └──────────────┘
│ columnMapping (JSONB) │
│ rowStructure     │
│ compoundPattern  │
│ usageCount       │
└──────────────────┘

┌──────────────┐         ┌──────────────┐
│   Project    │ 1 ── N  │  Outbound    │  (레거시)
│──────────────│         │──────────────│
│ id (PK)      │         │ id (PK)      │
│ name         │         │ orderId      │
└──────────────┘         │ sku          │
                         │ quantity     │
                         │ projectId (FK) │
                         │ productId (FK, nullable) │
                         └──────────────┘
```

### Enum 타입

| Enum | 값 | 용도 |
|------|----|------|
| `order_status` | `PENDING`, `PROCESSING`, `COMPLETED` | 주문 처리 상태 |
| `upload_type` | `outbound`, `product` | 업로드 템플릿 유형 |

### 인덱스

| 테이블 | 인덱스 | 컬럼 |
|--------|--------|------|
| `products` | UNIQUE | `sku` |
| `orders` | UNIQUE | `(outbound_batch_id, order_id)` |
| `outbound_items` | INDEX | `(outbound_batch_id, product_id)` |
| `outbound_items` | INDEX | `(outbound_batch_id, order_id)` |
| `outbounds` | INDEX | `(project_id, product_id)` |
| `outbounds` | INDEX | `(project_id, order_id)` |

## 프론트엔드 라우트

| 경로 | 기능 |
|------|------|
| `/` | 랜딩 페이지 |
| `/products` | 상품 그룹 목록 |
| `/products/new` | 새 상품 그룹 생성 |
| `/products/[id]` | 상품 그룹 상세 (상품 목록, 엑셀 업로드) |
| `/outbound` | 출고 배치 목록, 엑셀 업로드 |
| `/outbound/new` | 새 출고 배치 생성 |
| `/outbound/[id]` | 출고 배치 상세 (주문/아이템 목록) |
| `/outbound/[id]/packing` | 패킹 계산 및 결과 |
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
| `OPENAI_API_KEY` | OpenAI API 키 (AI 매핑용) |
