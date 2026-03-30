---
name: db-performance
description: DB 쿼리 성능 가이드. 서비스 레이어에서 DB 조회/업데이트 코드를 작성할 때 순차 처리, N+1, O(n²) 패턴을 방지한다. 서비스 파일 작성, DB 쿼리 작성, 성능 최적화 요청 시 트리거.
---

# DB 쿼리 성능 가이드

서비스 레이어(`src/lib/services/`)에서 DB 쿼리를 작성할 때 따라야 하는 성능 규칙.

## 금지 패턴

### 1. 루프 내 순차 await 쿼리 (N+1)

```ts
// BAD: N개의 순차 DB 호출
for (const id of ids) {
  const result = await db.select().from(table).where(eq(table.id, id));
}

// GOOD: 1개의 벌크 조회
const results = await db.select().from(table).where(inArray(table.id, ids));
```

벌크 조회 후 `Map`으로 인덱싱하여 O(1) 접근:

```ts
const rows = await db.select().from(table).where(inArray(table.id, ids));
const map = new Map(rows.map((r) => [r.id, r]));
```

### 2. 루프 내 순차 UPDATE

```ts
// BAD: N개의 순차 업데이트
for (const item of items) {
  await tx.update(table).set({ col: item.value }).where(eq(table.id, item.id));
}
```

대안 선택 기준:

| 조건 | 패턴 |
|------|------|
| 모든 row에 같은 값 설정 | `inArray` 벌크 업데이트 1회 |
| row마다 다른 값 설정 + 100건 이하 | `Promise.all` (트랜잭션 내에서도 가능) |
| row마다 다른 값 설정 + 100건 초과 | `CASE WHEN` 벌크 SQL |

**같은 값 벌크 업데이트:**

```ts
await tx.update(orders)
  .set({ status: 'PROCESSING' })
  .where(inArray(orders.id, successIds));
```

**DELETE + bulk INSERT (row마다 다른 값, JSONB 포함):**

CASE WHEN은 JSONB 컬럼이 있으면 쿼리가 거대해져서 타임아웃 발생. DELETE 후 INSERT가 안전:

```ts
const CHUNK_SIZE = 500;
const orderIds = results.map((r) => r.orderId);

for (let i = 0; i < orderIds.length; i += CHUNK_SIZE) {
  await tx.delete(table).where(
    and(eq(table.parentId, parentId), inArray(table.id, orderIds.slice(i, i + CHUNK_SIZE))),
  );
}

const newRows = results.map((r) => ({ ...r.data }));
for (let i = 0; i < newRows.length; i += CHUNK_SIZE) {
  await tx.insert(table).values(newRows.slice(i, i + CHUNK_SIZE));
}
```

### 3. 루프 내 배열 필터링 (O(n^2))

```ts
// BAD: 주문별로 전체 아이템 스캔
for (const order of orders) {
  const items = allItems.filter((i) => i.orderId === order.id);
}

// GOOD: 사전 인덱싱 후 O(1) 조회
const itemsByOrderId = new Map<string, typeof allItems>();
for (const item of allItems) {
  const arr = itemsByOrderId.get(item.orderId);
  if (arr) arr.push(item);
  else itemsByOrderId.set(item.orderId, [item]);
}

for (const order of orders) {
  const items = itemsByOrderId.get(order.id) ?? [];
}
```

## 트랜잭션 최적화

### 순수 계산은 트랜잭션 밖에서

트랜잭션은 DB 커넥션을 점유하므로, 순수 계산 로직은 밖에서 수행하고 결과만 트랜잭션 내에서 저장한다:

```ts
// GOOD: 계산 먼저, 저장은 벌크로
const results = items.map((item) => computeResult(item));

await db.transaction(async (tx) => {
  await bulkInsertOrUpdate(tx, results);
});
```

### 벌크 서비스 함수 제공

같은 테이블을 N번 조회하는 패턴이 반복되면, 서비스에 벌크 함수를 추가한다:

```ts
// boxes.ts 예시
export async function findByGroupIds(groupIds: string[]) {
  if (groupIds.length === 0) return new Map();
  const rows = await db.select().from(boxes).where(inArray(boxes.boxGroupId, groupIds));
  // Map으로 그룹핑하여 반환
}
```

## 체크리스트

서비스 함수 작성 후 다음을 확인한다:

- [ ] `for`/`forEach` 루프 안에 `await db.` 호출이 없는가?
- [ ] `for`/`forEach` 루프 안에 `.filter()` / `.find()`로 대규모 배열을 스캔하지 않는가?
- [ ] 트랜잭션 내에 순수 계산 로직이 포함되어 있지 않은가?
- [ ] 같은 테이블을 N번 조회하는 대신 벌크 조회 + Map 인덱싱을 사용하는가?
