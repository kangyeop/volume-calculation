# Packing 도메인

출고 배치의 아이템을 박스에 최적 배정하는 패킹 계산 도메인. 부피 기반 그리디 알고리즘으로 박스를 선택하고, 그룹핑 옵션에 따라 독립적으로 패킹을 수행한다.

## 데이터 모델

### PackingResult

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| orderId | UUID (FK → orders, UNIQUE) | 주문 UUID (1:1) |
| shipmentId | UUID (FK → shipments) | |
| boxId | UUID (FK → boxes) | 배정된 박스 (nullable, null=미배정) |
| packedCount | integer | 담긴 아이템 수 |
| efficiency | numeric(10,4) | 부피 활용률 |
| totalCBM | numeric(10,4) | CBM (m³) |
| groupLabel | varchar(255) | 그룹 식별자 (nullable) |
| groupIndex | integer | 그룹 순서 인덱스 (nullable) |
| boxNumber | integer | 그룹 내 박스 순번 (nullable) |
| items | jsonb | PackingResultItem[] — SKU별 상세 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**관계:** Order 1 : 1 PackingResult, Shipment 1 : N PackingResult, Box 1 : N PackingResult

**items JSONB 구조 (PackingResultItem):**

| 필드 | 타입 | 설명 |
|------|------|------|
| sku | string | 상품 SKU |
| productName | string | 상품명 |
| quantity | number | 수량 |
| boxName | string | 배정된 박스 이름 |
| boxNumber | number | 박스 순번 |
| boxIndex | number | 전체 박스 인덱스 |
| boxCBM | number | 박스 CBM |
| efficiency | number | 부피 활용률 |
| unpacked | boolean | 미배정 여부 |
| unpackedReason | string? | 미배정 사유 |
| placements | Placement3D[]? | 3D 배치 좌표 |

## 페이지

| 경로 | 기능 |
|------|------|
| `/shipments/[id]/packing` | 패킹 계산 및 결과 조회 |

### 패킹 페이지 주요 기능

- **패킹 계산**: 상품 그룹별 연결된 박스 그룹을 자동으로 사용하여 패킹 실행
- **추천 결과 표시**: 그룹별 박스 배정 결과를 정규화하여 표시
- **박스 변경**: 추천 결과에서 미지정·할당 박스 모두 다른 박스로 변경 (배치 API로 race condition 없이 처리)
- **미배정 경고**: 박스에 담기지 못한 아이템을 경고로 표시
- **엑셀 내보내기**: 정산 패킹 결과를 엑셀 파일로 다운로드 (주문 기준: 주문번호, 박스, SKU 구성, 에어캡/바코드 개수)

## API

### 패킹 계산

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/shipments/{shipmentId}/packing/calculate` | 그룹핑 옵션 기반 패킹 계산 |
| POST | `/api/shipments/{shipmentId}/packing/calculate-order` | 주문 단위 3D 패킹 계산 |

### 패킹 결과

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/shipments/{shipmentId}/packing/results` | 패킹 결과 목록 |

### 추천/내보내기

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/shipments/{shipmentId}/packing/recommendation` | 저장된 추천 결과 조회 |
| PATCH | `/api/shipments/{shipmentId}/packing/recommendation` | 박스 배정 변경 |
| POST | `/api/shipments/{shipmentId}/confirm` | 패킹 확정 |
| DELETE | `/api/shipments/{shipmentId}/confirm` | 확정 해제 |

(패킹 확정/해제 API는 Shipment 도메인에서 관리)

## 비즈니스 로직

### 그룹핑 및 Configuration 일괄 처리

패킹 계산 전에 아이템을 주문번호(`orderIdentifier`) 기준으로 그룹 분할한다. 동일한 SKU 조합(Configuration)을 가진 주문 그룹은 패킹 알고리즘을 **1회만** 실행하고, 결과를 모든 매칭 주문에 복제한다. 이를 통해 동일 Configuration 주문 수백 건도 Configuration 수만큼만 계산한다. groupLabel 형식: `Order: ORD-001`.

### 상품 그룹별 박스 그룹 자동 결정

각 주문 그룹의 첫 번째 상품이 속한 **상품 그룹(ProductGroup)**의 `boxGroupId`를 조회하여, 해당 박스 그룹의 박스로 패킹한다. 같은 주문의 상품은 항상 같은 상품 그룹에 속한다는 전제 하에 동작한다. 사용자가 패킹 페이지에서 박스 그룹을 수동 선택할 필요가 없다.

### 패킹 알고리즘

레이어 기반 그리디 알고리즘으로, 아이템을 층(layer) → 행(row) → 열(position) 순서로 배치하여 공간 간섭을 검증한다.

**회전 규칙**: 상품은 수평 회전(가로↔세로 swap)만 허용하며, 세워서 넣기(높이 축 변경)는 불가. 높이는 항상 고정된다.

**사전 필터링**:
1. 개별 아이템 치수 적합성 검사 (높이는 박스 높이 이하, 가로·세로는 수평 회전 허용하여 비교)
2. 전체 아이템 부피 합 ≤ 박스 유효 용량 (부피 × 0.9) 확인

**레이어 배치 시뮬레이션**:
1. 아이템을 수량만큼 전개 후 부피 내림차순 정렬 (큰 것부터 배치)
2. 각 아이템에 대해 수평 회전(가로↔세로) 2방향을 시도
3. 현재 행에 배치 가능하면 배치, 불가능하면 새 행 시작, 행도 불가능하면 새 층 시작
4. 박스 방향도 3가지(바닥면 조합)를 시도하여 가장 잘 들어가는 방향 선택

**박스 선택**: 부피 오름차순으로 순회하며 사전 필터링 + 레이어 시뮬레이션을 통과하는 가장 작은 박스를 선택. 적합 박스가 없으면 '미지정' 박스에 배정.

**결과 계산**: 박스별 efficiency = usedVolume / boxVolume, totalCBM = Σ(박스 부피 / 1,000,000). 유효 용량의 0.9 계수는 박스 선택 시 사전 필터에만 적용되며 결과 효율 계산에는 미반영.

### 정산 패킹 지원

`calculate()` 함수는 `{ onlyPending: true }` 옵션으로 정산 패킹도 처리한다. 이 모드에서는 PENDING 주문만 대상으로 하며, 성공 시 orders.status를 PROCESSING으로 업데이트하고, 박스 매칭 실패 시 에러 대신 실패 카운트를 반환한다.

### 결과 저장

재계산 시 기존 결과를 삭제 후 새로 생성한다 (누적 히스토리 아님). 상세 아이템 정보는 `items` JSONB 컬럼에 저장된다.

### 패킹 확정

패킹 결과가 존재하는 출고건에 대해 확정(`CONFIRMED`) 상태로 전환할 수 있다. 확정된 출고건은 재계산, 박스 변경이 불가능하며 Excel 내보내기만 허용된다. 확정 해제로 `PACKING` 상태로 되돌릴 수 있다.

- `POST /api/shipments/{shipmentId}/confirm` — 확정
- `DELETE /api/shipments/{shipmentId}/confirm` — 확정 해제

### 제한사항

- 레이어 기반 휴리스틱이므로 최적해를 보장하지 않음 (층 경계에서 공간 낭비 발생 가능)
- 분할 패킹 없음 (한 박스에 안 들어가면 '미지정' 처리)
- 아이템 무게를 고려하지 않음
- 같은 주문의 상품은 반드시 같은 상품 그룹에 속해야 함 (혼합 불가)

## 다른 도메인과의 연관

| 연관 도메인 | 관계 |
|-------------|------|
| **Shipment** | 출고 건의 아이템을 패킹 대상으로 사용, 추천 결과를 출고 건에 저장 |
| **Product** | 상품 치수(W×L×H)를 부피 계산에 사용. 상품의 상품 그룹을 통해 박스 그룹을 자동 결정 |
| **Box** | 상품 그룹에 연결된 박스 그룹에서 사용 가능한 박스 목록을 가져와 패킹에 사용 |

## 주요 파일

| 파일 | 역할 |
|------|------|
| `src/lib/db/schema.ts` | DB 스키마 (packingResults) |
| `src/lib/services/packing.ts` | 패킹 계산·조회·추천 서비스 |
| `src/lib/algorithms/packing.ts` | 패킹 알고리즘 구현 |
| `src/hooks/queries/usePacking.ts` | React Query 훅 (계산, 결과 조회, 추천) |
| `src/hooks/usePackingNormalizer.ts` | 추천 결과 정규화 훅 |
| `src/types/index.ts` | 패킹 관련 타입 정의 (PackingResultItem 등) |
| `src/app/(main)/shipments/[id]/packing/page.tsx` | 패킹 UI 페이지 |
| `src/app/api/shipments/[shipmentId]/packing/` | 패킹 API 라우트 |
