# 출고 도메인 (Shipment)

출고 프로세스 전체를 담당하는 도메인. 엑셀 업로드 → Shipment/Order/OrderItem 생성 → 패킹 계산 → 결과 내보내기 흐름을 관리한다.

## 데이터 모델

### 엔터티 관계

```
Shipment (출고 건)
├── 1:N → Order (주문)
├── 1:N → OrderItem (주문 아이템)
├── 1:N → PackingResult (패킹 요약)
└── 1:N → PackingResultDetail (패킹 상세)

Order (주문)
└── 1:N → OrderItem (논리적 관계, FK 없음)

OrderItem (주문 아이템)
└── N:1 → Product (상품 치수 참조, nullable)
```

### Shipment

출고 작업의 최상위 컨테이너. 하나의 엑셀 업로드 또는 수동 생성 단위.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| name | varchar(255) | 출고명 (자동 생성: `YYYYMMDD-N-파일명`) |
| lastBoxGroupId | UUID | 마지막 사용한 박스 그룹 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**DB 테이블:** `shipments`

### Order

Shipment 내 개별 주문. OrderItem 생성 시 자동으로 생성된다 (별도 생성 API 없음).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 내부 식별자 |
| orderId | varchar(255) | 사용자 대면 주문번호 (예: `ORD-001`) |
| recipientName | varchar(255), nullable | 수령인 |
| address | text, nullable | 배송 주소 |
| status | enum | `PENDING` / `PROCESSING` / `COMPLETED` |
| shipmentId | UUID (FK → shipments) | |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**제약조건:** UNIQUE `(shipment_id, order_id)` — 동일 출고 건 내 주문번호 중복 방지

### OrderItem

출고 건 내 개별 상품 라인. 하나의 주문에 여러 아이템이 포함된다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| orderId | varchar(255) | 주문 식별자 (아래 주의사항 참고) |
| orderIdentifier | varchar(255), nullable | 사용자 대면 주문번호 |
| sku | varchar(255) | 상품 SKU |
| quantity | integer | 수량 |
| shipmentId | UUID (FK → shipments) | |
| productId | UUID (FK → products), nullable | SET NULL on delete |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**DB 테이블:** `order_items`

**인덱스:**
- `(shipment_id, product_id)`
- `(shipment_id, order_id)`

### orderId 필드의 이중 의미

`orderItems.orderId`는 DB FK가 아닌 varchar 필드로, 생성 경로에 따라 저장되는 값이 다르다:

| 생성 경로 | `orderId`에 저장되는 값 | `orderIdentifier` |
|-----------|----------------------|-------------------|
| 단건 생성 (`create`) | 사용자 대면 주문번호 (`"ORD-001"`) | 사용자 대면 주문번호 |
| 벌크 생성 (`createBulk`) | Order 테이블의 UUID PK | 사용자 대면 주문번호 |
| 파일 업로드 벌크 (`createOrderItemsWithOrder`) | Order 테이블의 UUID PK | 사용자 대면 주문번호 |

`orderIdentifier`는 항상 사용자 대면 주문번호를 저장하므로, 주문번호 기준 조회 시에는 `orderIdentifier`를 사용해야 한다.

## Order 자동 생성 흐름

```
OrderItem 생성 요청 (orderId: "ORD-001")
       │
       ▼
  Shipment 내 orderId="ORD-001" Order 존재?
       │
  ┌────┴────┐
  │ Yes     │ No
  ▼         ▼
기존 Order  새 Order 생성 (status: PENDING)
  │         │
  └────┬────┘
       ▼
  OrderItem 저장
```

벌크 생성 시에도 동일한 로직. 같은 `orderId`를 가진 아이템들은 하나의 Order에 묶인다. 청크 단위(500건)로 트랜잭션 처리.

## 패킹에서의 그룹핑

패킹 계산 시 아이템들을 어떤 기준으로 묶어 박스에 배정할지 결정한다.

| 옵션 | 기준 | 설명 |
|------|------|------|
| `ORDER` | orderId | 주문번호별로 별도 박스 세트 |
| `RECIPIENT` | recipientName | 동일 수령인의 모든 주문을 합산 |
| `ORDER_RECIPIENT` | orderId + recipientName | 가장 세분화된 그룹핑 |

**예시:**

```
ORD-001 (홍길동) → [상품A x2, 상품B x1]
ORD-002 (홍길동) → [상품C x3]
ORD-003 (김철수) → [상품A x1]

ORDER       → 3그룹: ORD-001, ORD-002, ORD-003
RECIPIENT   → 2그룹: 홍길동(A+B+C), 김철수(A)
ORDER_RECIP → 3그룹: ORD-001_홍길동, ORD-002_홍길동, ORD-003_김철수
```

## 구성 요약 (Configuration Summary)

Shipment 상세 페이지에서 아이템들을 SKU+수량 조합별로 그룹핑하여 보여준다. 동일한 상품 구성을 가진 주문들을 한눈에 파악할 수 있다.

```
주문 A: 상품X x1, 상품Y x2  ─┐
주문 B: 상품X x1, 상품Y x2  ─┤── 구성 "X:1|Y:2" → 3건
주문 C: 상품X x1, 상품Y x2  ─┘
주문 D: 상품Z x5            ─── 구성 "Z:5" → 1건
```

## 업로드 파이프라인

### 업로드 방식

| 방식 | 엔드포인트 | 설명 |
|------|-----------|------|
| 직접 저장 | `POST /api/upload/shipment-direct` | 파일 → Shipment 자동 생성 → 아이템 즉시 저장 |
| 벌크 추가 | `POST .../order-items/bulk-with-file` | 기존 Shipment에 엑셀로 아이템 추가 |
| 단건 추가 | `POST .../order-items` | 수동으로 단건 아이템 추가 |

### 전체 흐름

```
엑셀 파일 업로드
       │
       ▼
  엑셀 파싱 (ExcelJS)
       │
       ▼
  템플릿 매칭 (코사인 유사도)
       │
  ┌────┴────┐
  │ hit     │ miss
  ▼         ▼
저장된      OpenAI Structured Output
매핑 사용    (컬럼 매핑 추론)
  │         │
  └────┬────┘
       ▼
  사용자 확인/수정
       ▼
  row-normalizer (복합 행 분리)
       ▼
  data-transformer (DTO 변환)
       ▼
  상품 자동 매칭 (OpenAI → productId 연결)
       ▼
  Shipment + Order + OrderItem 생성
```

### 복합 행 처리

하나의 셀에 여러 상품이 포함된 경우:

```
입력: "(상품A / 1ea)\r\n(상품B / 2ea)"
       ↓ row-normalizer
출력: [
  { sku: "상품A", quantity: 1 },
  { sku: "상품B", quantity: 2 }
]
```

## 페이지

| 경로 | 기능 |
|------|------|
| `/shipments` | 출고 목록 (테이블: 출고명, 주문 수, 생성일, 삭제) |
| `/shipments/new` | 새 출고 생성 (이름 입력 또는 엑셀 업로드) |
| `/shipments/[id]` | 출고 상세 — 구성 요약, 패킹 계산 진입 |
| `/shipments/[id]/packing` | 박스 그룹·그룹핑 선택 → 계산 → 결과 → 내보내기 |

## API

### Shipment 관리

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/shipments` | 전체 목록 (createdAt 내림차순) |
| POST | `/api/shipments` | 생성 (`{ name }`) |
| GET | `/api/shipments/{shipmentId}` | 상세 (orders, items, packing 포함) |
| DELETE | `/api/shipments/{shipmentId}` | 삭제 (cascade) |

### OrderItem 관리

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `.../order-items` | 아이템 목록 (`?page=N&limit=50`, orderIdentifier 기준 페이지네이션) |
| POST | `.../order-items` | 단건 추가 (Order 자동 생성) |
| POST | `.../order-items/bulk` | 벌크 추가 (트랜잭션, 500건 청크) |
| POST | `.../order-items/bulk-with-file` | 엑셀 파일로 벌크 추가 |
| DELETE | `.../order-items` | 전체 아이템 삭제 |
| GET | `.../order-items/configuration-summary` | 구성 요약 |

### 주문 관련

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `.../orders/{orderId}` | 주문 상세 |
| POST | `.../orders/{orderId}/map-products` | 주문 내 아이템 상품 매핑 |
| GET | `.../orders/{orderId}/volume` | 주문 총 부피 계산 |

### 패킹

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `.../packing/calculate` | 패킹 계산 (`{ groupingOption, boxGroupId }`) |
| GET | `.../packing/recommendation` | 저장된 패킹 추천 조회 |
| GET | `.../packing/results` | 패킹 결과 요약 목록 |
| GET | `.../packing/details` | 패킹 결과 상세 목록 |
| GET | `.../packing/results/{orderId}` | 주문별 패킹 결과 |
| POST | `.../packing/calculate-order` | 단일 주문 패킹 계산 |
| POST | `.../packing/export` | 결과 엑셀 내보내기 |

(`.../` = `/api/shipments/{shipmentId}/`)

## 삭제 정책

Shipment 삭제 시 트랜잭션으로 순서대로 삭제:

1. PackingResultDetail
2. PackingResult
3. OrderItem
4. Order
5. Shipment

## 다른 도메인과의 연관

| 연관 도메인 | 관계 |
|-------------|------|
| **Product** | OrderItem.productId로 상품 치수 참조. 업로드 시 AI 매칭. |
| **Box / BoxGroup** | 패킹 계산 시 박스 그룹 선택하여 해당 박스들로 배정 |

## 주요 파일

| 파일 | 역할 |
|------|------|
| `src/lib/db/schema.ts` | DB 스키마 (shipments, orders, orderItems) |
| `src/lib/services/shipment.ts` | Shipment CRUD, 출고명 생성, cascade 삭제 |
| `src/lib/services/order-item.ts` | OrderItem CRUD, 벌크 생성, 구성 요약, Order 자동 생성 |
| `src/lib/services/packing.ts` | 패킹 계산, 결과 저장, 그룹핑 |
| `src/lib/services/upload.ts` | 엑셀 업로드 파이프라인 |
| `src/lib/services/data-transformer.ts` | 엑셀 행 → DTO 변환 |
| `src/lib/services/row-normalizer.ts` | 복합 행 분리 |
| `src/lib/algorithms/packing.ts` | 패킹 알고리즘 (별도 문서: `05-패킹-알고리즘.md`) |
| `src/hooks/queries/useShipments.ts` | React Query 훅 (Shipment) |
| `src/hooks/queries/useOrderItems.ts` | React Query 훅 (OrderItem) |
| `src/hooks/queries/usePacking.ts` | React Query 훅 (패킹) |
| `src/app/(main)/shipments/` | 출고 UI 페이지 |
