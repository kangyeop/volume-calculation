# API 스펙

모든 API는 `/api` prefix를 사용합니다.

## Product Groups

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/product-groups` | 전체 상품 그룹 목록 |
| POST | `/product-groups` | 상품 그룹 생성 |
| GET | `/product-groups/:id` | 상품 그룹 상세 (상품 목록 포함) |
| DELETE | `/product-groups/:id` | 상품 그룹 삭제 |

## Products

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/product-groups/:groupId/products` | 그룹 내 상품 목록 |
| POST | `/product-groups/:groupId/products` | 상품 단건 등록 |
| POST | `/product-groups/:groupId/products/bulk` | 상품 벌크 등록 |
| PATCH | `/products/:id` | 상품 수정 |
| DELETE | `/products/:id` | 상품 삭제 |
| DELETE | `/product-groups/:groupId/products` | 벌크 삭제 (body: { ids }) |

## Outbound Batches

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/outbound-batches` | 전체 배치 목록 |
| GET | `/outbound-batches/:id` | 배치 상세 |
| DELETE | `/outbound-batches/:id` | 배치 삭제 |

## Outbound Items

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/outbound-batches/:batchId/outbounds` | 출고 아이템 목록 (page, limit 파라미터) |
| GET | `/outbound-batches/:batchId/outbounds/configuration-summary` | 구성 요약 (SKU 조합별 주문 수) |
| POST | `/outbound-batches/:batchId/outbounds` | 아이템 단건 등록 |
| POST | `/outbound-batches/:batchId/outbounds/bulk` | 아이템 벌크 등록 |
| POST | `/outbound-batches/:batchId/outbounds/bulk-with-file` | 파일과 함께 벌크 등록 |
| DELETE | `/outbound-batches/:batchId/outbounds/:id` | 아이템 삭제 |
| DELETE | `/outbound-batches/:batchId/outbounds` | 배치 내 전체 아이템 삭제 |

## Upload (출고 업로드)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/upload/outbound-direct` | 출고 엑셀 업로드 → AI 매핑 → 자동 저장 |
| POST | `/upload/parse` | 엑셀 파싱만 수행 (레거시) |
| POST | `/upload/map-products` | 상품 컬럼 매핑 |
| POST | `/upload/confirm` | 업로드 확정 |

### POST /upload/outbound-direct

요청: `multipart/form-data` (file)

응답:
```json
{
  "success": true,
  "data": {
    "imported": 42,
    "unmatched": [
      { "sku": "미등록상품A", "quantity": 5, "reason": "No matching product found" }
    ],
    "batchName": "2026-03-18_outbound_001",
    "batchId": "uuid-xxx",
    "totalRows": 50
  }
}
```

## Product Upload (상품 업로드)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/product-upload/parse?groupId=xxx` | 상품 엑셀 파싱 + AI 컬럼 매핑 |
| POST | `/product-upload/confirm` | 상품 업로드 확정, DB 저장 |

### POST /product-upload/parse

요청: `multipart/form-data` (file), Query: groupId

응답:
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "headers": ["SKU", "상품명", "가로x세로x높이"],
    "rowCount": 100,
    "rows": [{ "SKU": "ABC-001", "상품명": "테스트", "가로x세로x높이": "100x200x300" }],
    "mapping": {
      "mapping": {
        "sku": { "columnName": "SKU" },
        "name": { "columnName": "상품명" },
        "dimensions": { "columnName": "가로x세로x높이" }
      },
      "unmappedColumns": [],
      "dimensionFormat": "combined"
    },
    "fileName": "products.xlsx"
  }
}
```

## Packing (패킹 계산)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/outbound-batches/:batchId/packing/calculate` | 전체 패킹 계산 |
| POST | `/outbound-batches/:batchId/packing/calculate-order` | 단건 주문 패킹 계산 |
| GET | `/outbound-batches/:batchId/packing/recommendation` | 저장된 패킹 추천 조회 |
| GET | `/outbound-batches/:batchId/packing/results` | 패킹 결과 목록 |
| GET | `/outbound-batches/:batchId/packing/results/:orderId` | 주문별 결과 |
| GET | `/outbound-batches/:batchId/packing/details` | 패킹 상세 기록 |
| GET | `/outbound-batches/:batchId/packing/export` | 엑셀 내보내기 |

### POST /outbound-batches/:batchId/packing/calculate

요청:
```json
{ "groupingOption": "ORDER" }
```

응답:
```json
{
  "groups": [
    {
      "groupLabel": "ORD-001",
      "boxes": [
        {
          "box": { "id": "...", "name": "소형박스", "width": 30, "length": 20, "height": 15 },
          "count": 2,
          "packedSKUs": [{ "skuId": "SKU-001", "name": "상품A", "quantity": 3 }]
        }
      ],
      "unpackedItems": [],
      "totalCBM": 0.018,
      "totalEfficiency": 78.5
    }
  ],
  "totalCBM": 0.150,
  "totalEfficiency": 81.2
}
```

## Boxes (박스)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/boxes` | 전체 박스 목록 |
| POST | `/boxes` | 박스 등록 |
| GET | `/boxes/:id` | 박스 상세 |
| PATCH | `/boxes/:id` | 박스 수정 |
| DELETE | `/boxes/:id` | 박스 삭제 |

## Projects (레거시)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/projects` | 프로젝트 목록 |
| POST | `/projects` | 프로젝트 생성 |
| GET | `/projects/:id` | 프로젝트 상세 |
| GET | `/projects/stats` | 프로젝트 통계 |
| PATCH | `/projects/:id` | 프로젝트 수정 |
| DELETE | `/projects/:id` | 프로젝트 삭제 |

## Dashboard

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/dashboard/stats` | 대시보드 통계 |

## 공통 응답 형식

모든 API는 `ApiResponse<T>` 래퍼를 사용합니다:

```json
{
  "success": true,
  "data": { ... },
  "message": "optional message"
}
```

에러 시:
```json
{
  "success": false,
  "error": "에러 메시지",
  "message": "상세 설명"
}
```
