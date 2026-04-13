# 글로벌 물류 도메인 (Global Logistics)

**Plan reference:** [.omc/plans/global-logistics-tab.md](../../.omc/plans/global-logistics-tab.md)

글로벌 물류는 국내 물류('국내 물류')와 병렬된 독립적인 도메인으로, 수출 출고 건의 팔레트 패킹 최적화를 담당한다. 국내 물류가 사용자 정의 박스를 기반으로 패킹을 계산하는 반면, 글로벌 물류는 고정된 수출 팔레트(110 × 110 × 165 cm)를 기준으로 한다.

## 개요

| 항목 | 설명 |
|------|------|
| **목적** | 수출 출고 건의 팔레트 필요 수량 추정 및 최적화 |
| **팔레트 규격** | 110 × 110 × 165 cm (고정, 사용자 정의 불가) |
| **계산 단위** | 출고 건 단위, SKU별 독립 계산 |
| **알고리즘** | 완전 탐색 2D 코너 포인트 DFS (pinwheel 포함 non-guillotine 배치 발견) |
| **특징** | 상품 그룹, 상품, 출고, 주문, 주문 아이템, 팔레트 계산 결과 테이블 6개 신규 추가 |

## 데이터 모델

### 엔터티 관계

```
GlobalProductGroup (글로벌 상품 그룹)
└── 1:N → GlobalProduct (글로벌 상품)

GlobalShipment (글로벌 출고)
├── 1:N → GlobalOrder (주문)
├── 1:N → GlobalOrderItem (주문 아이템)
└── 1:N → GlobalPackingResult (팔레트 계산 결과)

GlobalOrder (주문)
└── 1:N → GlobalOrderItem

GlobalProduct ← GlobalOrderItem (FK, nullable)
GlobalProduct ← GlobalPackingResult (FK, nullable)
```

### GlobalProductGroup (글로벌 상품 그룹)

글로벌 상품 관리의 최상위 그룹. 국내 물류의 `ProductGroup`과 유사하나 `boxGroupId` 필드는 없다(팔레트는 고정).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| userId | UUID | 소유자 (auth.users) |
| name | varchar(255) | 그룹명 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**DB 테이블:** `global_product_groups`  
**인덱스:** `user_id`

### GlobalProduct (글로벌 상품)

글로벌 상품 정의. 내입 수량(`innerQuantity`)을 포함하며, `barcode` / `aircap` 필드는 없다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| userId | UUID | 소유자 |
| sku | varchar(255) | 상품 SKU |
| name | varchar(255) | 상품명 |
| width | numeric(10,2) | 폭 (cm) |
| length | numeric(10,2) | 길이 (cm) |
| height | numeric(10,2) | 높이 (cm) |
| innerQuantity | integer NOT NULL | 내입 수량 (카톤 1개당 포함 개수) |
| globalProductGroupId | UUID (FK → global_product_groups) | CASCADE |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**DB 테이블:** `global_products`  
**제약조건:** UNIQUE `(user_id, sku)` — 사용자별 SKU 중복 방지  
**인덱스:** `user_id`

### GlobalShipment (글로벌 출고)

출고 또는 글로벌 주문의 최상위 컨테이너. 수출 건마다 하나의 출고.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| userId | UUID | 소유자 |
| name | varchar(255) | 출고명 |
| status | enum (shipment_status) | `PACKING` / `CONFIRMED` |
| note | text, nullable | 비고 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**DB 테이블:** `global_shipments`  
**특징:**
- `type` 필드 없음 (글로벌 테이블 자체가 의미 = GLOBAL)
- `lastBoxGroupId` 필드 없음 (팔레트는 고정, 박스 그룹 개념 불필요)

### GlobalOrder (주문)

출고 내 개별 주문. 사용자 대면 주문번호(`orderNumber`)를 저장한다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 내부 식별자 |
| orderNumber | varchar(255) | 사용자 대면 주문번호 (예: `ORD-001`) |
| status | enum (order_status) | `PENDING` / `PROCESSING` / `COMPLETED` |
| globalShipmentId | UUID (FK → global_shipments) | CASCADE |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**제약조건:** UNIQUE `(global_shipment_id, order_number)` — 동일 출고 내 주문번호 중복 방지

### GlobalOrderItem (주문 아이템)

출고 내 개별 상품 라인. **Key difference:** `globalOrderId`는 UUID FK이다 (국내의 varchar `orderId` 냄새는 전파되지 않음).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| globalOrderId | UUID (FK → global_orders.id) | CASCADE, **적절한 UUID FK** |
| sku | varchar(255) | 상품 SKU |
| quantity | integer | 수량 |
| globalShipmentId | UUID (FK → global_shipments) | CASCADE, **역정규화** |
| globalProductId | UUID (FK → global_products), nullable | SET NULL |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**DB 테이블:** `global_order_items`  
**제약조건:**
- UNIQUE `(global_order_id, sku)` — 동일 주문 내 SKU 중복 방지. 재업로드 시 `ON CONFLICT ... DO UPDATE` 또는 선삭제로 멱등성 보장.

**인덱스:**
- `(global_shipment_id, sku)` — 팔레트 계산 시 집계 경로 (hot path)
- `(global_shipment_id, global_product_id)` — 상품 추적 용도

**역정규화 정당성:**
- `globalShipmentId`를 `global_orders`와 `global_order_items` 모두에 저장
- 팔레트 계산의 핵심 쿼리: `SELECT sku, SUM(quantity) FROM global_order_items WHERE globalShipmentId = ? GROUP BY sku` (single-table scan)
- 쓰기 시점에만 불변식 관리: `items.globalShipmentId === items.order.globalShipmentId`를 `global-upload.ts` 및 `global-order-item.ts`에서만 보장

### GlobalPackingResult (팔레트 계산 결과)

팔레트 계산 결과. **출고 단위, SKU별** 한 행.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| globalShipmentId | UUID (FK → global_shipments) | CASCADE |
| sku | varchar(255) | 상품 SKU |
| productName | varchar(255) | 상품명 (스냅샷) |
| globalProductId | UUID (FK → global_products), nullable | SET NULL (soft-edit 대비) |
| totalUnits | integer | 출고 내 해당 SKU 총 개수 (주문 아이템 수량 합) |
| innerQuantity | integer | 카톤당 내입 수량 (스냅샷) |
| cartonCount | integer | 필요 카톤 수 (`ceil(totalUnits / innerQuantity)`) |
| itemsPerLayer | integer | 한 층에 적재되는 카톤 수 |
| layersPerPallet | integer | 팔레트당 층 수 |
| cartonsPerPallet | integer | 팔레트당 카톤 수 (itemsPerLayer × layersPerPallet) |
| palletCount | integer | 필요 팔레트 수 |
| lastPalletCartons | integer | 마지막 팔레트의 카톤 수 |
| unpackable | boolean | `true` if 카톤이 팔레트를 초과 (W>110 OR L>110 OR H>165) |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**DB 테이블:** `global_packing_results`  
**제약조건:** UNIQUE `(global_shipment_id, sku)`  
**인덱스:** `global_shipment_id`

## 팔레트 계산 모델

### 고정 팔레트 규격

```
EXPORT_PALLET = {
  width: 110,    // cm
  length: 110,   // cm
  height: 165    // cm
}
```

### 계산 알고리즘

**완전 탐색 2D 코너 포인트 DFS.** 카톤은 upright(H축 회전 불가)로 고정하고, 바닥 면에서 `W×L` / `L×W` 두 방향을 혼합 배치 가능. 단일 층 내에서 **비-guillotine 배치(pinwheel 등)까지 발견**하는 완전 탐색 패커.

**탐색 구조:**
1. **면적 상한:** `U = floor((110 × 110) / (W × L))`
2. **반복 심화:** `n = U` 부터 `0`까지 감소시키며 "n개 배치가 존재하는가?" DFS 검사. 첫 성공이 최적.
3. **코너 포인트 열거:** 이미 배치된 카톤들의 `x + width`, `y + height` 값과 `{0}`의 곱집합이 다음 배치 후보 좌표. `(y, x)` 정렬로 결정론 + bottom-left-first 휴리스틱.
4. **분기:** 각 후보 좌표에서 `[W, L]`, `[L, W]` 두 방향 시도.
5. **가지치기:**
   - 면적 프루닝: `(target - placed) × W × L > 110² − usedArea` 이면 실패
   - 대칭 브레이킹: 첫 카톤은 `(0, 0)` 고정
   - 스텝 예산: 200,000 노드 초과 시 legacy guillotine 폴백(과거 결과 보장)

**Oversize guard (비대칭):** 임의 축에서 초과 여부 확인
- `width > 110` **OR** `length > 110` **OR** `height > 165` → `unpackable = true`, 후속 필드 영전

**계산 수식:**

1. **카톤 수:** `cartonCount = ceil(totalUnits / innerQuantity)`
   - `innerQuantity < 1` → 업스트림 validation 오류

2. **한 층 카톤 수:** `itemsPerLayer = maxCartonsInLayer(110, 110, W, L)`
   - DFS 완전 탐색 결과. 균일 그리드, strip-split, pinwheel 등 모든 배치 탐색

3. **층 수:** `layersPerPallet = floor(165 / H)`

4. **팔레트당 카톤:** `cartonsPerPallet = itemsPerLayer * layersPerPallet`

5. **팔레트 수:** `palletCount = ceil(cartonCount / cartonsPerPallet)`

6. **마지막 팔레트:** `lastPalletCartons = cartonCount - (palletCount - 1) * cartonsPerPallet`

7. **마지막 팔레트 완성:** `lastPalletIsFull = (lastPalletCartons === cartonsPerPallet)`

### 정확성 및 한계

- **Type:** 단일 층 · 단일 SKU · upright 전제 하에서 **최적(optimal)**. 면적 상한에서 반복 심화로 첫 성공이 증명된 최적해.
- **결정론:** 동일 입력에 대해 항상 동일한 `itemsPerLayer` 반환. 코너 후보 정렬 및 방향 순서 고정.
- **성능:** 전형적 팔레트/카톤 조합은 <100ms. 스텝 예산 200k로 최악 케이스 안전망.
- **미보장:**
  - **H축 회전(카톤 눕히기)**: 현재 전제상 upright만 허용
  - **혼합 SKU 동일 팔레트 최적화**: 단일 SKU 기준으로만 계산
- **폴백:** 스텝 예산 초과 시 legacy guillotine 결과로 폴백 (`console.warn` 로그). 결과 품질이 저하될 수 있으나 기존 수준은 보장.

### 단위 테스트 (Vitest)

파일: `src/lib/algorithms/__tests__/pallet.test.ts`

테스트 케이스:

| 케이스 | 카톤(cm) | innerQty | 총개수 | 예상 결과 | 검증 포인트 |
|--------|---------|---------|-------|---------|-----------|
| 정확 적합 | 50×50×55 | 1 | 24 | itemsPerLayer=4, layersPerPallet=3, cartonsPerPallet=12, palletCount=2, lastPalletCartons=12, lastPalletIsFull=true | 균일 그리드 |
| 부분 마지막 | 50×50×55 | 1 | 13 | cartonCount=13, palletCount=2, lastPalletCartons=1, lastPalletIsFull=false | 미완성 팔레트 |
| Oversize width | 120×40×50 | 1 | 10 | unpackable=true, palletCount=0 | 가로 초과 |
| Oversize length | 40×120×50 | 1 | 10 | unpackable=true | 세로 초과 |
| Oversize height | 40×40×200 | 1 | 10 | unpackable=true | 높이 초과 |
| 단일 카톤 | 60×40×55 | 100 | 50 | cartonCount=1, itemsPerLayer=4, cartonsPerPallet=12, palletCount=1 | 1 팔레트 미만 |
| 혼합 배향 | 40×30×50 | 1 | 24 | itemsPerLayer=8, cartonsPerPallet=24, palletCount=1, lastPalletIsFull=true | 균일 그리드 초과 (6 → 8) |
| **Pinwheel** | **59×46×36** | **1** | **152** | **itemsPerLayer=4, layersPerPallet=4, cartonsPerPallet=16, palletCount=10** | **non-guillotine 배치 발견 (3 → 4)** |
| 내입 수량 커버 | 60×40×55 | 10 | 250 | cartonCount=25, itemsPerLayer=4, cartonsPerPallet=12, palletCount=3, lastPalletCartons=1 | innerQuantity 합산 |

## 엑셀 업로드 및 집계

### 포맷 및 파서

- **파서:** `src/lib/services/global-format-parser.ts` — 글로벌 전용 구현
- **포맷:** `globalStandard` (단일 포맷)
- **엑셀 컬럼:** `상품명`, `출고수량` (필수), `유통기한`·`로트번호`·`순번` 등 기타 컬럼은 존재해도 무시
- **주문번호:** 엑셀에 주문번호 컬럼이 없으므로 모든 행을 고정 더미 주문번호 `DEFAULT` 하나로 묶음
- **richText 대응:** `src/lib/services/excel.ts`의 `cellToString`이 ExcelJS richText 객체를 평탄화해 한/영 혼용 폰트 상품명도 정상 파싱

### 업로드 흐름

```
엑셀 파일 업로드 (globalStandard)
       │
       ▼
  엑셀 파싱 (ExcelJS) + richText 평탄화
       │
       ▼
  상품명 / 출고수량 컬럼 매핑
       │
       ▼
  GlobalShipment + GlobalOrder(orderNumber='DEFAULT') + GlobalOrderItem 생성
```

### 주문 그룹핑 및 멱등성

- **그룹핑 기준:** `orderNumber` 기준으로 행 그룹핑 (`globalStandard`는 모든 행이 `DEFAULT` 단일 주문)
- **중복 행 사전 집계:** 동일 `(orderNumber, sku)` 조합 행들의 `quantity` 합산
- **재업로드 멱등성:** UNIQUE INDEX `(global_order_id, sku)` + `ON CONFLICT ... DO UPDATE` 또는 선삭제
  ```
  DELETE FROM global_order_items WHERE globalOrderId = ?
  INSERT INTO global_order_items (...)  -- 새 데이터 일괄 삽입
  ```

## 집계 모델

### Shipment-grain per-SKU 계산

1. **입력:** 출고 내 모든 주문 아이템
2. **집계:** `SELECT sku, SUM(quantity) AS totalUnits FROM global_order_items WHERE globalShipmentId = ? GROUP BY sku`
3. **상품 조회:** SKU별로 `global_products` 조인하여 `{ width, length, height, innerQuantity, name }` 획득
4. **팔레트 계산:** 각 SKU에 대해 `calculatePalletization(carton, totalUnits)` 호출
5. **결과 저장:** `global_packing_results`에 (shipment, sku) 당 1행으로 저장

### 미매칭 SKU 처리

- `global_order_items` 에는 있으나 `global_products` 에 없는 SKU
- 결과 요약에 `unmatched` 리스트로 표시
- `global_packing_results` 에는 행 작성 안 함 (계산 불가)

### 비공개 목표

- **v1 비목표:** 혼합 SKU 팔레트 최적화 (각 SKU는 독립적으로 팔레트 계산)
- **v1 비목표:** 정산 / 유형 판별 (no `type` column)
- **v1 비목표:** 무게 / 통화 추적
- **v1 비목표:** 글로벌 전용 엑셀 형식 파서 (국내 재사용)

## 페이지

### 상품 관리

| 경로 | 기능 |
|------|------|
| `/global/products` | 글로벌 상품 그룹 목록 (생성일, 상품 개수) |
| `/global/products/new` | 새 그룹 생성 및 엑셀 일괄 업로드 |
| `/global/products/[id]` | 그룹 상세 — 상품 테이블 (인라인 편집 W/L/H/innerQty, 일괄 삭제) |

### 출고 관리

| 경로 | 기능 |
|------|------|
| `/global/shipments` | 글로벌 출고 목록 (출고명, 상태, 생성일) |
| `/global/shipments/new` | 새 출고 생성 또는 엑셀 업로드 |
| `/global/shipments/[id]` | 출고 상세 (주문/아이템 요약) |
| `/global/shipments/[id]/packing` | 팔레트 계산 및 결과 표시 |

### 팔레트 결과 UI

**`/global/shipments/[id]/packing` 페이지:**

- **상단 요약:** `총 팔레트 수: N pallets (M SKUs)`
- **경고 배너:**
  - Oversize SKU 목록 (초과 축명 명시)
  - 미매칭 SKU 목록
- **결과 테이블 (SKU별 카드):**
  - 상품명, SKU
  - 총 개수 + 카톤 수 (innerQuantity 표시)
  - `팔레트 수`, `한 층 적재 수량`, `한 팔레트 적재 수량`, `마지막 팔레트 수량`
  - 마지막 팔레트 미완성 시 강조 표시 (예: `3/12 칸`)
  - **3D 뷰 모달:** 카드의 `3D로 보기` 버튼으로 팔레트 한 대의 실제 박스 배치를 react-three-fiber 기반 인터랙티브 뷰(OrbitControls)로 확인. 각 층은 `computeLayerLayout`가 반환하는 동일한 Rect 레이아웃을 `layersPerPallet` 만큼 수직 반복해 렌더.

## API

### 글로벌 상품 그룹

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/global/product-groups` | 글로벌 상품 그룹 목록 |
| POST | `/api/global/product-groups` | 글로벌 상품 그룹 생성 |
| PATCH | `/api/global/product-groups/[groupId]` | 글로벌 상품 그룹 수정 |
| DELETE | `/api/global/product-groups/[groupId]` | 글로벌 상품 그룹 삭제 |
| GET | `/api/global/product-groups/[groupId]/products` | 그룹 내 글로벌 상품 목록 |
| POST | `/api/global/product-groups/[groupId]/products` | 글로벌 상품 생성 |
| POST | `/api/global/product-groups/[groupId]/products/bulk` | 글로벌 상품 일괄 생성 |
| DELETE | `/api/global/product-groups/[groupId]/products` | 글로벌 상품 일괄 삭제 |

### 글로벌 상품

| Method | Endpoint | 설명 |
|--------|----------|------|
| PATCH | `/api/global/products/[id]` | 글로벌 상품 수정 |
| DELETE | `/api/global/products/[id]` | 글로벌 상품 삭제 |

### 글로벌 출고

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/global/shipments` | 글로벌 출고 목록 |
| POST | `/api/global/shipments` | 글로벌 출고 생성 |
| GET | `/api/global/shipments/[id]` | 글로벌 출고 상세 |
| DELETE | `/api/global/shipments/[id]` | 글로벌 출고 삭제 |

### 글로벌 팔레트 계산

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/global/shipments/[id]/packing/calculate` | 팔레트 계산 실행 |
| GET | `/api/global/shipments/[id]/packing/recommendation` | 팔레트 계산 결과 조회 |

### 글로벌 업로드

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/global/upload/shipment` | 글로벌 출고 엑셀 업로드 |

## 주요 파일

### DB & 기초 서비스

| 파일 | 역할 |
|------|------|
| `src/lib/db/schema.ts` | DB 스키마 (global_* 테이블) |
| `src/lib/services/global-product-groups.ts` | GlobalProductGroup CRUD |
| `src/lib/services/global-products.ts` | GlobalProduct CRUD |
| `src/lib/services/global-shipment.ts` | GlobalShipment CRUD |
| `src/lib/services/global-order-item.ts` | GlobalOrderItem CRUD + 자동 Order 생성 |
| `src/lib/services/global-format-parser.ts` | 엑셀 파서 (`globalStandard`) |
| `src/lib/services/global-upload.ts` | 출고 엑셀 업로드 파이프라인 |
| `src/lib/services/global-packing.ts` | 팔레트 계산 + 결과 저장 |

### 알고리즘

| 파일 | 역할 |
|------|------|
| `src/lib/algorithms/pallet.ts` | 팔레트 계산 알고리즘 (`computeLayerLayout`은 개수 + Rect 좌표 반환, `maxCartonsInLayer`는 개수만 반환하는 얇은 래퍼) |
| `src/lib/algorithms/pallet-layout.ts` | 3D 뷰 전용 헬퍼 (`buildPalletLayout3D`) — `computeLayerLayout` 결과를 층 수까지 합쳐 반환 |
| `src/lib/algorithms/__tests__/pallet.test.ts` | 팔레트 알고리즘 테스트 (Vitest) |
| `src/components/global/PalletPacking3DView.tsx` | react-three-fiber 기반 팔레트 3D 캔버스 |
| `src/components/global/PalletPacking3DModal.tsx` | 3D 뷰 모달 래퍼 (`next/dynamic`으로 Canvas 번들 지연 로드) |

### React Query & Hooks

| 파일 | 역할 |
|------|------|
| `src/hooks/queries/useGlobalProductGroups.ts` | React Query 훅 (GlobalProductGroup) |
| `src/hooks/queries/useGlobalProducts.ts` | React Query 훅 (GlobalProduct) |
| `src/hooks/queries/useGlobalShipments.ts` | React Query 훅 (GlobalShipment) |
| `src/hooks/queries/useGlobalPacking.ts` | React Query 훅 (팔레트 계산) |

### UI 페이지

| 디렉토리 | 역할 |
|---------|------|
| `src/app/(main)/global/products/` | 글로벌 상품 관리 페이지 |
| `src/app/(main)/global/shipments/` | 글로벌 출고 관리 페이지 |

## 다른 도메인과의 연관

| 연관 도메인 | 관계 |
|-------------|------|
| **Product (국내)** | 완전 독립. GlobalProduct는 별도 테이블. |
| **Shipment (국내)** | 완전 독립. GlobalShipment는 별도 테이블. |
| **Box / BoxGroup (국내)** | 미사용. 팔레트는 고정. |

## 알려진 마이그레이션 리스크

- **no `type` column on `global_shipments`:** 향후 정산 흐름(`SETTLEMENT`)이 필요하면 마이그레이션 필요. 현재는 출고(`SHIPMENT`)만 지원 예정.
- **v2 엑셀 포맷:** 글로벌 전용 파서로 교체 시 스키마 변경 없음; 서비스 로직만 교체.
