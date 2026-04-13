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
        boolean aircap "default false"
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

    Estimate {
        uuid id PK
        uuid userId
        varchar name
        varchar fileName
        text storagePath
        integer fileSize
        timestamp createdAt
        timestamp updatedAt
    }

    GlobalProductGroup ||--o{ GlobalProduct : "has many"
    GlobalProductGroup {
        uuid id PK
        uuid userId "nullable"
        varchar name
        timestamp createdAt
        timestamp updatedAt
    }

    GlobalProduct {
        uuid id PK
        uuid userId "nullable"
        varchar sku
        varchar name
        numeric width
        numeric length
        numeric height
        integer innerQuantity
        uuid globalProductGroupId FK
        timestamp createdAt
        timestamp updatedAt
    }

    GlobalShipment ||--o{ GlobalOrder : "has many"
    GlobalShipment ||--o{ GlobalOrderItem : "has many"
    GlobalShipment ||--o{ GlobalPackingResult : "has many"
    GlobalShipment {
        uuid id PK
        uuid userId "nullable"
        varchar name
        shipment_status status "default PACKING"
        text note "nullable"
        timestamp createdAt
        timestamp updatedAt
    }

    GlobalOrder ||--o{ GlobalOrderItem : "has many"
    GlobalOrder {
        uuid id PK
        varchar orderNumber
        order_status status "default PENDING"
        uuid globalShipmentId FK
        timestamp createdAt
        timestamp updatedAt
    }

    GlobalProduct ||--o{ GlobalOrderItem : "mapped to"
    GlobalOrderItem {
        uuid id PK
        uuid globalOrderId FK
        varchar sku
        integer quantity
        uuid globalShipmentId FK
        uuid globalProductId FK "nullable"
        timestamp createdAt
        timestamp updatedAt
    }

    GlobalProduct ||--o{ GlobalPackingResult : "mapped to"
    GlobalPackingResult {
        uuid id PK
        uuid globalShipmentId FK
        varchar sku
        varchar productName
        uuid globalProductId FK "nullable"
        integer totalUnits
        integer innerQuantity
        integer cartonCount
        integer itemsPerLayer
        integer layersPerPallet
        integer cartonsPerPallet
        integer palletCount
        integer lastPalletCartons
        boolean unpackable "default false"
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
| `estimates` | INDEX | `user_id` |
| `global_product_groups` | INDEX | `user_id` |
| `global_products` | UNIQUE | `(user_id, sku)` |
| `global_products` | INDEX | `user_id` |
| `global_orders` | UNIQUE | `(global_shipment_id, order_number)` |
| `global_order_items` | UNIQUE | `(global_order_id, sku, lot_number, expiration_date)` |
| `global_order_items` | INDEX | `(global_shipment_id, sku)` |
| `global_order_items` | INDEX | `(global_shipment_id, global_product_id)` |
| `global_packing_results` | UNIQUE | `(global_shipment_id, sku)` |
| `global_packing_results` | INDEX | `global_shipment_id` |

## 관계 요약

| 부모 | 자식 | 관계 | onDelete |
|------|------|------|----------|
| `ProductGroup` | `Product` | 1:N | CASCADE |
| `BoxGroup` | `ProductGroup` | 1:N | - |
| `BoxGroup` | `Box` | 0..1:N | SET NULL |
| `Shipment` | `Order` | 1:N | CASCADE |
| `Shipment` | `OrderItem` | 1:N | CASCADE |
| `Shipment` | `PackingResult` | 1:N | CASCADE |
| `Order` | `PackingResult` | 1:1 | CASCADE |
| `Box` | `PackingResult` | 1:N | SET NULL |
| `Product` | `OrderItem` | 1:N | SET NULL |
| `Project` | `Outbound` | 1:N | - |
| `Box` | `BoxStockHistory` | 1:N | CASCADE |
| `Product` | `Outbound` | 1:N | SET NULL |
| `GlobalProductGroup` | `GlobalProduct` | 1:N | CASCADE |
| `GlobalShipment` | `GlobalOrder` | 1:N | CASCADE |
| `GlobalShipment` | `GlobalOrderItem` | 1:N | CASCADE |
| `GlobalShipment` | `GlobalPackingResult` | 1:N | CASCADE |
| `GlobalOrder` | `GlobalOrderItem` | 1:N | CASCADE |
| `GlobalProduct` | `GlobalOrderItem` | 1:N | SET NULL |
| `GlobalProduct` | `GlobalPackingResult` | 1:N | SET NULL |
