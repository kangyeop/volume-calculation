# Product 도메인

상품 마스터 데이터를 관리하는 도메인. 상품 그룹 단위로 상품을 묶어 관리하며, 고정된 컬럼 형식의 엑셀로 일괄 등록한다.

## 데이터 모델

### ProductGroup

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| userId | UUID, nullable | 소유자 (auth.users) |
| name | varchar(255) | 그룹 이름 |
| boxGroupId | UUID (FK → boxGroups) | 패킹 시 사용할 박스 그룹 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**관계:** ProductGroup N : 1 BoxGroup (패킹 시 이 상품 그룹의 주문은 연결된 박스 그룹의 박스를 사용)

### Product

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| userId | UUID, nullable | 소유자 (auth.users) |
| sku | varchar(255), UNIQUE(userId, sku) | 상품명 (사용자별 고유 식별자) |
| width | numeric(10,2) | 가로 (cm) |
| length | numeric(10,2) | 세로 (cm) |
| height | numeric(10,2) | 높이 (cm) |
| barcode | boolean (default false) | 바코드 여부 |
| aircap | boolean (default false) | 에어캡 여부 |
| productGroupId | UUID (FK → productGroups) | CASCADE DELETE |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**관계:** ProductGroup 1 : N Product

## 페이지

| 경로 | 기능 |
|------|------|
| `/products` | 상품 그룹 목록 (테이블: 그룹명, 상품 수, 생성일, 삭제) |
| `/products/new` | 새 상품 그룹 생성 (이름 입력 + 엑셀 업로드 옵션) |
| `/products/[id]` | 상품 그룹 상세 — 상품 목록, 치수 인라인 편집, 엑셀 업로드, 일괄 삭제 |

### 상품 그룹 상세 (`/products/[id]`) 주요 기능

- **상품 테이블**: 상품명, W×L×H 치수 표시
- **인라인 치수 편집**: 각 상품의 가로/세로/높이를 직접 수정
- **체크박스 일괄 선택**: 전체 선택 토글 + 선택 삭제
- **엑셀 업로드**: 드래그앤드롭으로 상품 일괄 등록

## API

### 상품 그룹

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/product-groups` | 전체 목록 조회 |
| POST | `/api/product-groups` | 그룹 생성 (name, boxGroupId) |
| GET | `/api/product-groups/{groupId}` | 그룹 상세 (상품 포함) |
| PATCH | `/api/product-groups/{groupId}` | 그룹 수정 (name, boxGroupId) |
| DELETE | `/api/product-groups/{groupId}` | 그룹 삭제 (상품 CASCADE) |

### 상품

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/products` | 전체 상품 목록 |
| GET | `/api/product-groups/{groupId}/products` | 그룹 내 상품 목록 |
| POST | `/api/product-groups/{groupId}/products` | 상품 생성 |
| POST | `/api/product-groups/{groupId}/products/bulk` | 상품 벌크 생성 |
| DELETE | `/api/product-groups/{groupId}/products` | 상품 일괄 삭제 (body: ids) |
| PATCH | `/api/products/{id}` | 상품 치수 수정 |
| DELETE | `/api/products/{id}` | 상품 개별 삭제 |

### 상품 엑셀 업로드

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/product-upload/parse?groupId={id}` | 엑셀 파싱 (고정 컬럼) |

## 비즈니스 로직

### 엑셀 업로드 (고정 컬럼)

엑셀 파일의 컬럼명이 고정되어 있다:

| 엑셀 컬럼명 | 매핑 필드 | 설명 |
|-------------|----------|------|
| 상품명 | sku | 상품 고유 식별자 |
| 체적정보 | width, length, height | 결합 치수 (예: `10x20x30`) |
| 바코드 | barcode | 바코드 여부 (O/true/1 → true, 그 외 → false) |
| 에어캡 | aircap | 에어캡 여부 (o/O/true/yes/1 → true) |

**치수 파싱 규칙:**
- `"10x20x30"` → width=10, length=20, height=30
- 구분자: `x`, `X`, `*`, `×`
- 단위 자동 제거: cm, mm, m, in, inch
- 누락 값은 기본값 `1`로 처리

### SKU 충돌 처리 (Upsert)

일괄 등록 시 동일 SKU가 이미 존재하면 `onConflictDoUpdate`로 기존 상품을 업데이트한다. 새 SKU는 신규 생성.

## 다른 도메인과의 연관

| 연관 도메인 | 관계 |
|-------------|------|
| **Box** | 상품 그룹은 박스 그룹과 1:1 연결되어, 패킹 시 해당 박스 그룹의 박스를 사용 |
| **Outbound** | 출고 아이템의 SKU를 상품 마스터와 AI 매칭하여 `productId` 연결 |
| **Packing** | 상품 치수(W×L×H)를 패킹 알고리즘에서 부피 계산에 사용. 상품 그룹의 `boxGroupId`로 박스 그룹 자동 결정 |

## 주요 파일

| 파일 | 역할 |
|------|------|
| `src/lib/db/schema.ts` | DB 스키마 (productGroups, products) |
| `src/lib/services/products.ts` | 상품 CRUD 서비스 |
| `src/lib/services/product-groups.ts` | 상품 그룹 서비스 |
| `src/lib/services/product-upload.ts` | 엑셀 업로드 파싱/변환/등록 |
| `src/lib/api.ts` | 프론트엔드 API 클라이언트 |
| `src/hooks/queries/useProductGroups.ts` | React Query 훅 (그룹) |
| `src/hooks/queries/useProducts.ts` | React Query 훅 (상품) |
| `src/hooks/useProductUpload.ts` | 상품 업로드 플로우 훅 |
| `src/hooks/useProductFilters.ts` | 상품 필터링 훅 |
| `src/app/(main)/products/` | 상품 UI 페이지 |
| `src/app/api/product-groups/` | 상품 그룹 API 라우트 |
| `src/app/api/products/` | 상품 API 라우트 |
| `src/app/api/product-upload/` | 상품 업로드 API 라우트 |
