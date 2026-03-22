# Packing 도메인

출고 배치의 아이템을 박스에 최적 배정하는 패킹 계산 도메인. 부피 기반 그리디 알고리즘으로 박스를 선택하고, 그룹핑 옵션에 따라 독립적으로 패킹을 수행한다.

## 데이터 모델

### PackingResult

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| boxId | varchar(255) | 박스 ID (nullable) |
| boxName | varchar(255) | 박스 이름 (nullable) |
| packedCount | integer | 담긴 아이템 수 |
| efficiency | numeric(10,4) | 부피 활용률 |
| totalCBM | numeric(10,4) | CBM (m³) |
| groupLabel | varchar(255) | 그룹 식별자 (nullable) |
| orderId | varchar(255) | 주문번호 (nullable) |
| boxNumber | integer | 그룹 내 박스 순번 (nullable) |
| outboundBatchId | UUID (FK → outboundBatches) | CASCADE DELETE |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**관계:** OutboundBatch 1 : N PackingResult

### PackingResultDetail

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| outboundBatchId | UUID (FK → outboundBatches) | CASCADE DELETE |
| orderId | varchar(255) | 주문번호 |
| recipientName | varchar(255) | 수령인 (nullable) |
| sku | varchar(255) | 상품 SKU |
| productName | varchar(255) | 상품명 |
| quantity | integer | 수량 |
| boxName | varchar(255) | 배정된 박스 이름 |
| boxNumber | integer | 박스 순번 |
| boxIndex | integer | 전체 박스 인덱스 |
| boxCBM | numeric(10,4) | 박스 CBM |
| efficiency | numeric(10,4) | 부피 활용률 |
| unpacked | boolean | 미배정 여부 (nullable) |
| unpackedReason | text | 미배정 사유 (nullable) |
| placements | jsonb | 3D 배치 좌표 (nullable) |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**관계:** OutboundBatch 1 : N PackingResultDetail

## 페이지

| 경로 | 기능 |
|------|------|
| `/outbound/[id]/packing` | 패킹 계산 및 결과 조회 |

### 패킹 페이지 주요 기능

- **패킹 계산**: 박스 그룹과 그룹핑 옵션을 선택하여 패킹 실행
- **추천 결과 표시**: 그룹별 박스 배정 결과를 정규화하여 표시
- **박스 변경**: 추천 결과에서 개별 박스를 다른 박스로 변경
- **미배정 경고**: 박스에 담기지 못한 아이템을 경고로 표시
- **엑셀 내보내기**: 패킹 결과를 엑셀 파일로 다운로드

## API

### 패킹 계산

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/outbound-batches/{batchId}/packing/calculate` | 그룹핑 옵션 기반 패킹 계산 |
| POST | `/api/outbound-batches/{batchId}/packing/calculate-order` | 주문 단위 3D 패킹 계산 |

### 패킹 결과

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/outbound-batches/{batchId}/packing/results` | 패킹 결과 목록 |
| GET | `/api/outbound-batches/{batchId}/packing/details` | 패킹 상세 결과 |

### 추천/내보내기

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/outbound-batches/{batchId}/packing/recommendation` | 저장된 추천 결과 조회 |
| PATCH | `/api/outbound-batches/{batchId}/packing/recommendation` | 박스 배정 변경 |
| GET | `/api/outbound-batches/{batchId}/packing/export` | 엑셀 내보내기 |

## 비즈니스 로직

### 그룹핑

패킹 계산 전에 출고 아이템을 주문번호(`orderIdentifier`) 기준으로 그룹 분할한다. 각 그룹은 독립적으로 패킹된다 (그룹 간 박스 공유 없음). groupLabel 형식: `Order: ORD-001`.

### 패킹 알고리즘

부피 기반 그리디 알고리즘으로, 실제 3D 좌표 배치 없이 부피와 치수 적합성만으로 박스를 결정한다.

**치수 적합성 검사**: 아이템과 박스의 치수를 각각 오름차순 정렬 후 대응하는 값을 비교한다. 정렬 비교이므로 회전을 암묵적으로 허용한다. 단, 개별 아이템 단위 검사이며 여러 아이템 간 공간 간섭은 검증하지 않는다.

**유효 용량**: 박스 부피 × 0.9 (90%). 10%는 여유 공간. 선택 기준에만 적용되며 효율 계산에는 미반영.

**박스 선택**:
1. 박스를 부피 오름차순으로 순회하며, 전체 아이템 부피 합 ≤ 유효 용량이고 모든 아이템이 치수 적합한 가장 작은 박스를 선택
2. 적합 박스가 없으면 → 전체 아이템을 '미지정' 박스에 배정 (분할 패킹 없음)

**결과 계산**: 박스별 efficiency = usedVolume / boxVolume, totalCBM = Σ(박스 부피 / 1,000,000)

### 결과 저장

재계산 시 기존 결과를 삭제 후 새로 생성한다 (누적 히스토리 아님). 추천 결과는 outboundBatches.packingRecommendation (JSONB)에 저장된다.

### 제한사항

- 부피 기반 계산만 수행, 실제 3D 좌표 배치 없음
- 그리디 알고리즘이므로 최적해를 보장하지 않음
- 아이템 무게를 고려하지 않음

## 다른 도메인과의 연관

| 연관 도메인 | 관계 |
|-------------|------|
| **Outbound** | 출고 배치의 아이템을 패킹 대상으로 사용, 추천 결과를 배치에 저장 |
| **Product** | 상품 치수(W×L×H)를 부피 계산에 사용 |
| **Box** | 박스 그룹에서 사용 가능한 박스 목록을 가져와 패킹에 사용 |

## 주요 파일

| 파일 | 역할 |
|------|------|
| `src/lib/db/schema.ts` | DB 스키마 (packingResults, packingResultDetails) |
| `src/lib/services/packing.ts` | 패킹 계산·조회·추천 서비스 |
| `src/lib/algorithms/packing.ts` | 패킹 알고리즘 구현 |
| `src/hooks/queries/usePacking.ts` | React Query 훅 (계산, 결과 조회, 추천, 내보내기) |
| `src/hooks/usePackingNormalizer.ts` | 추천 결과 정규화 훅 |
| `src/types/index.ts` | 패킹 관련 타입 정의 |
| `src/app/(main)/outbound/[id]/packing/page.tsx` | 패킹 UI 페이지 |
| `src/app/api/outbound-batches/[batchId]/packing/` | 패킹 API 라우트 |
