# 데이터베이스 스키마

## ER 다이어그램

```mermaid
erDiagram
    BoxGroup ||--o{ ProductGroup : "used by"
    ProductGroup ||--o{ Product : "has many"
    ProductGroup {
        uuid id PK
        uuid userId "nullable"
        varchar name
        uuid boxGroupId FK
        timestamp createdAt
        timestamp updatedAt
    }

    Product {
        uuid id PK
        uuid userId "nullable"
        varchar sku
        varchar name
        numeric width
        numeric length
        numeric height
        boolean barcode "default false"
        aircap_type aircapType "nullable"
        uuid productGroupId FK
        timestamp createdAt
        timestamp updatedAt
    }

    BoxGroup |o--o{ Box : "has many (optional)"
    Box ||--o{ BoxStockHistory : "has many"
    Box ||--o{ PackingResult : "assigned to"
    BoxStockHistory {
        uuid id PK
        uuid boxId FK
        stock_change_type type
        integer quantity "signed delta"
        integer resultStock
        text note "nullable"
        timestamp createdAt
    }

    BoxGroup {
        uuid id PK
        uuid userId "nullable"
        varchar name
        timestamp createdAt
        timestamp updatedAt
    }

    Box {
        uuid id PK
        uuid userId "nullable"
        varchar name
        numeric width
        numeric length
        numeric height
        numeric price "nullable"
        integer stock "default 0"
        uuid boxGroupId FK "nullable"
        timestamp createdAt
        timestamp updatedAt
    }

    Shipment ||--o{ Order : "has many"
    Shipment ||--o{ OrderItem : "has many"
    Shipment ||--o{ PackingResult : "has many"
    Shipment {
        uuid id PK
        uuid userId "nullable"
        varchar name
        shipment_type type "default SHIPMENT"
        shipment_status status "default PACKING"
        text note "nullable"
        uuid lastBoxGroupId "nullable"
        timestamp createdAt
        timestamp updatedAt
    }

    Order ||--o| PackingResult : "has one (1:1)"
    Order {
        uuid id PK
        varchar orderId
        order_status status "default PENDING"
        uuid shipmentId FK
        timestamp createdAt
        timestamp updatedAt
    }

    Product ||--o{ OrderItem : "mapped to"
    OrderItem {
        uuid id PK
        varchar orderId
        varchar sku
        integer quantity
        varchar orderIdentifier "nullable"
        uuid shipmentId FK
        uuid productId FK "nullable"
        timestamp createdAt
        timestamp updatedAt
    }

    PackingResult {
        uuid id PK
        uuid orderId FK_UK "→ orders.id"
        uuid shipmentId FK "→ shipments.id"
        uuid boxId FK "→ boxes.id, nullable"
        integer packedCount
        numeric efficiency
        numeric totalCBM
        varchar groupLabel "nullable"
        integer groupIndex "nullable"
        integer boxNumber "nullable"
        jsonb items "PackingResultItem[]"
        timestamp createdAt
        timestamp updatedAt
    }

    Project ||--o{ Outbound : "has many (legacy)"
    Project {
        uuid id PK
        uuid userId "nullable"
        varchar name
        timestamp createdAt
        timestamp updatedAt
    }

    Product ||--o{ Outbound : "mapped to"
    Outbound {
        uuid id PK
        varchar orderId
        varchar sku
        integer quantity
        varchar orderIdentifier "nullable"
        uuid projectId FK
        uuid productId FK "nullable"
        timestamp createdAt
        timestamp updatedAt
    }
```

## Enum 타입

| Enum | 값 | 용도 |
|------|----|------|
| `order_status` | `PENDING`, `PROCESSING`, `COMPLETED` | 주문 처리 상태 |
| `shipment_status` | `PACKING`, `CONFIRMED` | 출고건 패킹 상태 |
| `shipment_type` | `SHIPMENT`, `SETTLEMENT` | Shipment 유형 (출고/정산) |
| `aircap_type` | `INDIVIDUAL`, `PER_ORDER`, `BOTH` | 에어캡 유형 (개별/건당/개별+건당) |
| `stock_change_type` | `INBOUND`, `OUTBOUND`, `INITIAL`, `ADJUSTMENT` | 재고 변동 유형 (입고/출고/초기등록/수정) |

## 인덱스

| 테이블 | 타입 | 컬럼 |
|--------|------|------|
| `products` | UNIQUE | `(user_id, sku)` |
| `orders` | UNIQUE | `(shipment_id, order_id)` |
| `orders` | INDEX | `order_id` |
| `order_items` | INDEX | `(shipment_id, product_id)` |
| `order_items` | INDEX | `(shipment_id, order_id)` |
| `outbounds` | INDEX | `(project_id, product_id)` |
| `outbounds` | INDEX | `(project_id, order_id)` |
| `box_stock_histories` | INDEX | `(box_id)` |
| `packing_results` | UNIQUE | `order_id` |
| `packing_results` | INDEX | `shipment_id` |

## 관계 요약

| 부모 | 자식 | 관계 | onDelete |
|------|------|------|----------|
| `ProductGroup` | `Product` | 1:N | CASCADE |
| `BoxGroup` | `ProductGroup` | 1:N | - |
| `BoxGroup` | `Box` | 0..1:N | SET NULL |
| `Shipment` | `Order` | 1:N | - |
| `Shipment` | `OrderItem` | 1:N | - |
| `Shipment` | `PackingResult` | 1:N | CASCADE |
| `Order` | `PackingResult` | 1:1 | CASCADE |
| `Box` | `PackingResult` | 1:N | SET NULL |
| `Product` | `OrderItem` | 1:N | SET NULL |
| `Project` | `Outbound` | 1:N | - |
| `Box` | `BoxStockHistory` | 1:N | CASCADE |
| `Product` | `Outbound` | 1:N | SET NULL |
