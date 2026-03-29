# 정산 도메인 (Settlement)

기존 확정된 출고(SHIPMENT)의 패킹 결과를 복사(Copy)하여 point-in-time 스냅샷을 생성하는 도메인. 미매칭 주문 중 SKU가 상품 DB에 존재하는 주문만 PENDING 상태로 저장되며, SKU가 없는 주문은 제외된다.

## 핵심 개념

### Copy Approach

정산은 기존 출고 데이터를 **참조가 아닌 복사**한다. settlement shipment는 자체 orders/orderItems/packingResults를 독립적으로 소유하므로:

- 원본 출고 데이터가 변경되어도 정산 데이터에 영향 없음
- 정산 삭제 시 원본 데이터 보존
- `packingResults.orderId` UNIQUE constraint 충돌 없음 (별도 orders row)

### 매칭 상태

| 상태 | 조건 | 의미 |
|------|------|------|
| `matched` | orders.status=COMPLETED, boxId != null | 기존 출고에서 매칭 + 박스 복사됨 |
| `matched_unassigned` | orders.status=COMPLETED, boxId == null | 매칭됐으나 원본에 boxId 없었음 |
| `auto_packed` | orders.status=PROCESSING | 미매칭 주문이 자동 패킹 계산됨 |
| `unmatched` | orders.status=PENDING | 기존 출고에서 주문번호를 찾지 못함. 패킹 미수행 |

## 데이터 모델

정산은 별도 테이블 없이 `shipments` 테이블의 `type='SETTLEMENT'`로 구분한다. orders, orderItems, packingResults 구조를 그대로 재활용한다.

### 사용하는 테이블

| 테이블 | 정산에서의 역할 |
|--------|----------------|
| `shipments` | type='SETTLEMENT'인 row가 정산 컨테이너 |
| `orders` | 정산 shipment에 종속된 주문 (원본에서 orderId 복사) |
| `order_items` | 엑셀에서 파싱된 아이템 (productId는 null) |
| `packing_results` | 매칭: 원본에서 boxId 복사 / 미매칭: boxId=null, items=[] |

### shipments.type 구분

| type | 용도 | 패킹 |
|------|------|------|
| `SHIPMENT` | 일반 출고 | 자동 패킹 계산 |
| `SETTLEMENT` | 정산 | 매칭 복사 + 수동 박스 지정 |

## 업로드 파이프라인

```
정산 엑셀 업로드 (정산 양식)
       |
       v
  parseAdjustment() — '출고주문번호' + '상품명' 파싱
       |
       v
  unique orderId 추출
       |
       v
  기존 CONFIRMED SHIPMENT의 orders 매칭
  (shipments JOIN, userId 필터, createdAt DESC — 최신 우선)
       |
       v
  매칭된 orders의 packingResults 조회
       |
       v
  Settlement shipment 생성 (type='SETTLEMENT')
       |
       v
  업로드된 SKU로 사용자 상품 필터 조회
       |
       v
  유효 주문 필터링 (미매칭 + SKU 미존재 → 제외)
       |
       v
  트랜잭션: 배치 INSERT 3회
  ├── 1) orders 일괄 INSERT + returning (COMPLETED=매칭, PENDING=미매칭)
  ├── 2) orderItems 일괄 INSERT
  └── 3) packingResults 일괄 INSERT
      ├── 매칭: 원본 boxId/items 복사
      └── 미매칭: boxId=null, items=[]
```

### 매칭 쿼리 규칙

- `shipments.type = 'SHIPMENT'` AND `shipments.status = 'CONFIRMED'`인 출고만 대상
- `shipments.userId`로 현재 사용자 필터
- 같은 orderId가 여러 confirmed shipment에 존재할 경우 `createdAt DESC`로 최신 것 우선
- `orders.order_id` standalone index로 cross-shipment 매칭 성능 확보

## 페이지

| 경로 | 기능 |
|------|------|
| `/settlements` | 정산 목록 (테이블: 정산명, 상태 뱃지, 생성일, 삭제) |
| `/settlements/new` | 정산 엑셀 업로드 (양식 선택 없음, 정산 형식 고정) |
| `/settlements/[id]` | 정산 상세 — Configuration 요약 뷰 + 매칭 상태 |
| `/settlements/[id]/packing` | 정산 패킹 — 상품 그룹별 패킹 결과 + 바코드/에어캡 + 미매칭 재계산 |

### 정산 상세 페이지 주요 기능

- **Configuration 요약 뷰**: 출고 상세와 동일한 형태로, 상품 조합(SKU 키)별 그룹화된 Collapsible 목록
- **통계 카드**: 총 주문 수, 고유 Configuration 수, 매칭 현황 (N건 매칭 / M건 미매칭)
- **매칭 상태 오버레이**: Configuration 그룹 헤더에 매칭/미매칭 요약 배지, 펼치면 주문별 상태 배지
- **패킹 버튼**: `/settlements/[id]/packing`으로 이동
- **확정/해제**: PACKING <-> CONFIRMED 상태 전환
- **삭제**: ConfirmDialog로 확인 후 cascade 삭제

### 정산 패킹 페이지 주요 기능

- **상품 그룹별 섹션**: 출고 패킹과 동일한 BoxTypeCard 그리드 + 바코드/에어캡 합계 표시
- **미매칭 패킹 계산**: 미매칭(PENDING) 주문만 대상으로 패킹 알고리즘 실행 (전략 선택: 부피/최장변)
- **전체 결과 표시**: 매칭된 주문은 읽기전용, 미매칭/자동패킹 주문만 박스 변경 가능
- **엑셀 내보내기**: 전체 패킹 결과 다운로드
- **확정/해제**: PACKING <-> CONFIRMED 상태 전환

## API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/settlements` | 정산 목록 (type=SETTLEMENT 필터) |
| POST | `/api/upload/settlement` | 정산 엑셀 업로드 (multipart/form-data, `file` 필드) |
| GET | `/api/settlements/{id}` | 정산 상세 (orders + 매칭 상태) |
| DELETE | `/api/settlements/{id}` | 정산 삭제 (cascade) |
| POST | `/api/settlements/{id}/auto-pack` | 미매칭 주문 일괄 자동 패킹 계산 (레거시) |
| PATCH | `/api/settlements/{id}/assign-box` | 수동 박스 지정 (`{ orderId, boxId }`) |
| POST | `/api/settlements/{id}/confirm` | 정산 확정 |
| DELETE | `/api/settlements/{id}/confirm` | 정산 확정 해제 |
| POST | `/api/settlements/{id}/packing/calculate` | 미매칭 주문 패킹 계산 (`{ strategy }`) |
| GET | `/api/settlements/{id}/packing/recommendation` | 저장된 패킹 추천 조회 |
| PATCH | `/api/settlements/{id}/packing/recommendation` | 박스 변경 (`{ items, newBoxId }`) |
| GET | `/api/settlements/{id}/packing/export` | 패킹 결과 엑셀 내보내기 |

### 업로드 응답

```json
{
  "success": true,
  "data": {
    "imported": 10,
    "unmatched": 1,
    "shipmentId": "uuid",
    "shipmentName": "20260326-1-파일명"
  }
}
```

### 상세 응답

```json
{
  "id": "uuid",
  "name": "20260326-1-파일명",
  "status": "PACKING",
  "createdAt": "2026-03-26T...",
  "orders": [
    {
      "orderUuid": "uuid",
      "orderId": "ORD-001",
      "items": [{ "sku": "상품A", "quantity": 2 }],
      "boxId": "uuid-or-null",
      "packingResultId": "uuid-or-null",
      "status": "matched | matched_unassigned | unmatched",
      "barcodeCount": 3,
      "aircapCount": 2
    }
  ]
}
```

## 비즈니스 로직

### 바코드/에어캡 개수 계산

정산 상세 조회 시 orderItems의 SKU로 상품 테이블을 조회하여 주문별 바코드/에어캡 개수를 계산한다.

- **바코드**: `product.barcode = true`인 상품의 수량 합계
- **에어캡**: `product.aircap = true`인 상품의 수량 합계

### Type Guard (assertSettlement)

모든 settlement 변경 API(상세 조회, 삭제, 확정, 박스 지정)는 `assertSettlement(id)`로 대상이 `type='SETTLEMENT'`인지 검증한다. SHIPMENT type의 데이터가 settlement API를 통해 조회/수정/삭제되는 것을 방지.

### 업로드 유효성 검증

- 엑셀 파싱 후 유효한 주문이 0건이면 즉시 에러 반환 (빈 파일/잘못된 양식 방어)

### 박스 지정 (assignBox)

- settlement type인 shipment만 대상 (userId + type 검증)
- packingResults의 boxId만 갱신, 원본 packingResult 불변
- 대상 packingResult가 없으면 에러 반환
- CONFIRMED 상태에서도 API 레벨에서는 가능하나 UI에서 드롭다운 비활성화

### 삭제 정책

`assertSettlement(id)` 검증 후 `shipment.remove()`를 재활용하여 트랜잭션으로 삭제:
1. packingResults (shipmentId 기준)
2. orderItems (shipmentId 기준)
3. orders (shipmentId 기준)
4. shipments (id + userId 기준)

원본 출고의 orders/packingResults는 별도 row이므로 영향 없음.

## 다른 도메인과의 연관

| 연관 도메인 | 관계 |
|-------------|------|
| **Shipment** | 매칭 대상. CONFIRMED SHIPMENT의 orders/packingResults를 복사 |
| **Packing** | packingResults 구조 재활용 |
| **Box** | 수동 박스 지정 시 boxes 테이블 참조 |

## 주요 파일

| 파일 | 역할 |
|------|------|
| `src/lib/services/settlement.ts` | 업로드, 상세 조회, 박스 지정 |
| `src/lib/services/shipment.ts` | create/findAll에 type 파라미터 (SETTLEMENT 지원) |
| `src/app/api/settlements/` | 정산 API 라우트 (목록, 상세, 삭제, 확정, 박스 지정, 패킹) |
| `src/app/api/upload/settlement/` | 정산 업로드 API |
| `src/app/(main)/settlements/` | 정산 UI (목록, 업로드, 상세, 패킹) |
| `src/hooks/queries/useSettlements.ts` | React Query 훅 12개 |
| `src/lib/services/format-parser.ts` | parseAdjustment() — 정산 엑셀 파싱 |

## 설계 결정

### 왜 별도 테이블이 아닌 type 컬럼인가

- 정산과 출고의 데이터 모델이 본질적으로 동일 (주문 -> 아이템 -> 박스 지정)
- 스키마 중복 방지, 기존 서비스/삭제 로직 재활용
- Copy Approach로 데이터 독립성 확보
- **가드레일**: 정산 고유 컬럼이 2개를 초과하면 별도 테이블 마이그레이션 검토

### 왜 Reference가 아닌 Copy인가

- `packingResults.orderId`에 UNIQUE index가 있어 동일 order에 복수 packing result 불가
- settlement 삭제 시 원본 데이터 오염 위험 방지
- point-in-time 스냅샷 보장
