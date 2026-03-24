# 데이터베이스 스키마

## ER 다이어그램

```mermaid
erDiagram
    BoxGroup ||--o{ ProductGroup : "used by"
    ProductGroup ||--o{ Product : "has many"
    ProductGroup {
        uuid id PK
        varchar name
        uuid boxGroupId FK
        timestamp createdAt
        timestamp updatedAt
    }

    Product {
        uuid id PK
        varchar sku UK
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

    BoxGroup ||--o{ Box : "has many"
    BoxGroup {
        uuid id PK
        varchar name
        timestamp createdAt
        timestamp updatedAt
    }

    Box {
        uuid id PK
        varchar name
        numeric width
        numeric length
        numeric height
        numeric price "nullable"
        uuid boxGroupId FK
        timestamp createdAt
        timestamp updatedAt
    }

    Shipment ||--o{ Order : "has many"
    Shipment ||--o{ OrderItem : "has many"
    Shipment ||--o{ PackingResult : "has many"
    Shipment ||--o{ PackingResultDetail : "has many"
    Shipment {
        uuid id PK
        varchar name
        shipment_status status "default PACKING"
        text note "nullable"
        uuid lastBoxGroupId "nullable"
        timestamp createdAt
        timestamp updatedAt
    }

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
        varchar boxId "nullable"
        varchar boxName "nullable"
        numeric boxWidth "nullable"
        numeric boxLength "nullable"
        numeric boxHeight "nullable"
        varchar boxGroupId "nullable"
        integer packedCount
        numeric efficiency
        numeric totalCBM
        varchar groupLabel "nullable"
        integer groupIndex "nullable"
        varchar orderId "nullable"
        integer boxNumber "nullable"
        uuid shipmentId FK
        timestamp createdAt
        timestamp updatedAt
    }

    PackingResultDetail {
        uuid id PK
        uuid shipmentId FK
        varchar orderId
        varchar sku
        varchar productName
        integer quantity
        varchar boxName
        integer boxNumber
        integer boxIndex
        numeric boxCBM
        numeric efficiency
        boolean unpacked "nullable"
        text unpackedReason "nullable"
        jsonb placements "nullable"
        timestamp createdAt
        timestamp updatedAt
    }

    Project ||--o{ Outbound : "has many (legacy)"
    Project {
        uuid id PK
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
| `aircap_type` | `INDIVIDUAL`, `PER_ORDER`, `BOTH` | 에어캡 유형 (개별/건당/개별+건당) |

## 인덱스

| 테이블 | 타입 | 컬럼 |
|--------|------|------|
| `products` | UNIQUE | `sku` |
| `orders` | UNIQUE | `(shipment_id, order_id)` |
| `order_items` | INDEX | `(shipment_id, product_id)` |
| `order_items` | INDEX | `(shipment_id, order_id)` |
| `outbounds` | INDEX | `(project_id, product_id)` |
| `outbounds` | INDEX | `(project_id, order_id)` |

## 관계 요약

| 부모 | 자식 | 관계 | onDelete |
|------|------|------|----------|
| `ProductGroup` | `Product` | 1:N | CASCADE |
| `BoxGroup` | `ProductGroup` | 1:N | - |
| `BoxGroup` | `Box` | 1:N | CASCADE |
| `Shipment` | `Order` | 1:N | - |
| `Shipment` | `OrderItem` | 1:N | - |
| `Shipment` | `PackingResult` | 1:N | - |
| `Shipment` | `PackingResultDetail` | 1:N | - |
| `Product` | `OrderItem` | 1:N | SET NULL |
| `Project` | `Outbound` | 1:N | - |
| `Product` | `Outbound` | 1:N | SET NULL |
