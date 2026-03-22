# DB 테이블별 저장 용량 추정

행(row) 하나당 디스크 크기 추정. 인덱스 포함.

> varchar는 실제 데이터 패턴 기준 평균값 사용 (order_id ~12자, SKU ~10자, 상품명 ~한글 10자, 박스명 ~한글 5자)

## 마스터 데이터

| 테이블 | 행당 크기 | 비고 |
|---|---|---|
| product_groups | **77 bytes** | |
| products | **168 bytes** | unique index(sku) 포함 |
| box_groups | **77 bytes** | |
| boxes | **134 bytes** | |

## 업무 데이터

| 테이블 | 행당 크기 | 비고 |
|---|---|---|
| shipments | **98 bytes** | |
| orders | **138 bytes** | unique index(shipment_id, order_id) 포함 |
| order_items | **220 bytes** | index 2개 포함 |
| projects | **77 bytes** | |
| outbounds | **220 bytes** | index 2개 포함 |

## 패킹 결과

| 테이블 | 행당 크기 | 비고 |
|---|---|---|
| packing_results | **202 bytes** | nullable 컬럼 다수 |
| packing_result_details | **178~1,178 bytes** | placements jsonb에 따라 변동 (상품 5개 배치 시 ~678 bytes) |

## 시뮬레이션: 출고 1건 (주문 100건, 주문당 SKU 3종)

| 테이블 | 행 수 | 소계 |
|---|---|---|
| shipments | 1 | 98 B |
| orders | 100 | 13.5 KB |
| order_items | 300 | 64.5 KB |
| packing_results | ~150 | 29.6 KB |
| packing_result_details | ~450 | 307.6 KB |
| **합계** | **~1,001** | **~415 KB** |

## 월간 추정 (하루 5건 × 30일)

| 테이블 | 월간 행 수 | 월간 용량 |
|---|---|---|
| shipments | 150 | 14 KB |
| orders | 15,000 | 2.0 MB |
| order_items | 45,000 | 9.4 MB |
| packing_results | 22,500 | 4.3 MB |
| packing_result_details | 67,500 | 45.0 MB |
| **월간 총합** | **~150,150** | **~60.7 MB** |

Supabase 무료 티어(500 MB) 기준 약 **7~8개월** 사용 가능. packing_result_details가 전체의 ~74%를 차지.
