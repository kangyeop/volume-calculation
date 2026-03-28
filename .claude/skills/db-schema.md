---
name: db-schema
description: Drizzle ORM 스키마 변경 및 Supabase 마이그레이션 가이드. DB 테이블 추가/수정/삭제, 컬럼 변경, enum 추가, 인덱스 변경 등 schema.ts를 수정하는 모든 작업에서 반드시 이 스킬을 따른다.
---

# DB Schema 변경 가이드

이 프로젝트는 Drizzle ORM + Supabase PostgreSQL을 사용한다. 스키마 변경은 프로덕션 데이터에 직접 영향을 주므로, 하위호환성을 최우선으로 고려한다.

## 스키마 파일 위치

- 스키마 정의: `src/lib/db/schema.ts`
- DB 클라이언트: `src/lib/db/index.ts`
- Drizzle 설정: `drizzle.config.ts`
- 마이그레이션 출력: `drizzle/` 폴더

## 변경 작업 순서

**`db:push`는 사용하지 않는다.** 항상 마이그레이션 파일 기반으로 작업한다.

1. `src/lib/db/schema.ts` 수정
2. `pnpm db:generate` 실행 → `drizzle/` 폴더에 migration SQL 생성
3. 생성된 SQL 파일 검토 (아래 체크리스트 참고)
4. 위험한 SQL이 있으면 수동 수정 (아래 "위험한 변경 시 안전한 패턴" 참고)
5. 사용자에게 검토 결과를 보여주고 확인 받기
6. `drizzle/` 폴더의 마이그레이션 파일을 코드와 함께 커밋

스키마 변경 작업 시 **반드시 2번(`db:generate`)까지 실행**하고, 생성된 SQL을 사용자에게 보여준다.

## 마이그레이션 적용

배포 시 `next build` 전에 자동으로 실행된다:

```json
"build": "pnpm db:migrate && next build"
```

- Drizzle Kit이 `drizzle/` 폴더의 마이그레이션 SQL을 순서대로 실행
- `__drizzle_migrations` 테이블로 적용 이력을 추적
- 이미 적용된 마이그레이션은 건너뜀

## 하위호환성 규칙

### 안전한 변경 (바로 적용 가능)
- 새 테이블 추가
- 기존 테이블에 nullable 컬럼 추가
- 기존 테이블에 default 값이 있는 컬럼 추가
- 새 인덱스 추가
- 새 enum 값 추가 (기존 값 뒤에)

### 위험한 변경 (사용자 확인 필수)
- 컬럼 삭제 → 의도된 삭제면 OK, 데이터 유실 인지 필요
- 컬럼 타입 변경 → 데이터 변환 실패 가능
- NOT NULL 제약 추가 → 기존 null 데이터가 있으면 실패
- enum 값 삭제/변경 → 해당 값을 쓰는 행이 있으면 실패
- 테이블/컬럼 이름 변경 → Drizzle이 DROP+CREATE로 처리하므로 반드시 수동 수정
- unique 제약 추가 → 기존 중복 데이터가 있으면 실패

### 위험한 변경 시 안전한 패턴

**테이블 이름 변경**: `db:generate`가 DROP TABLE + CREATE TABLE로 생성한다. 반드시 수동으로 `ALTER TABLE ... RENAME TO ...`로 교체한다.

```sql
-- db:generate가 생성하는 위험한 SQL (rename 의도일 때 사용 금지)
DROP TABLE old_name;
CREATE TABLE new_name (...);

-- 수동으로 교체해야 하는 안전한 SQL
ALTER TABLE old_name RENAME TO new_name;
```

**컬럼 이름 변경**: 마찬가지로 `db:generate`가 DROP COLUMN + ADD COLUMN으로 생성한다. 수동으로 교체한다.

```sql
ALTER TABLE table_name RENAME COLUMN old_column TO new_column;
```

**인덱스 이름 변경**:

```sql
ALTER INDEX old_index_name RENAME TO new_index_name;
```

**NOT NULL 추가**: default 값과 함께 추가하거나, 먼저 nullable로 추가 후 데이터 채운 뒤 NOT NULL 전환

**컬럼 삭제**: 코드에서 먼저 해당 컬럼 참조 제거 → 배포 → 이후 컬럼 삭제

## 커스텀 마이그레이션과 generate 중복 주의

`db:generate`는 스키마 diff를 기준으로 SQL을 생성하므로, **수동 작성한 커스텀 마이그레이션(backfill, 데이터 패치 등)의 DDL을 인식하지 못한다.** 커스텀 마이그레이션에서 `ALTER COLUMN SET NOT NULL` 등을 이미 실행했더라도, 다음 `db:generate`에서 동일한 DDL이 다시 생성될 수 있다.

중복 DDL이 포함된 마이그레이션을 실행하면:
- 이미 적용된 DDL에서 에러 발생
- Drizzle이 마이그레이션을 "적용됨"으로 기록하지만, **에러 이후의 문(statement)은 실행되지 않음**
- 결과적으로 일부 컬럼/인덱스/타입이 누락되는 부분 적용 상태가 됨

**방지 방법**: `db:generate` 후 생성된 SQL에서 이전 커스텀 마이그레이션과 겹치는 DDL이 있는지 확인하고, 중복 문을 제거한다.

## 생성된 SQL 검토 체크리스트

`pnpm db:generate` 실행 후 생성된 SQL 파일에서 다음을 확인:

- `DROP TABLE` → 의도된 삭제인가? rename 의도라면 ALTER RENAME으로 교체
- `DROP COLUMN` → 의도된 삭제인가? rename 의도라면 ALTER RENAME COLUMN으로 교체
- `ALTER COLUMN ... SET NOT NULL` → 기존 데이터에 null이 없는지
- `ALTER TYPE` (enum 변경) → 안전한 방향인지 (값 추가만 허용)
- 의도하지 않은 변경이 포함되어 있지 않은지
- **이전 커스텀 마이그레이션과 중복되는 DDL이 없는지**

## 스키마 작성 패턴

이 프로젝트에서 사용하는 공통 패턴:

```ts
export const newTable = pgTable('new_table', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});
```

- PK는 항상 `uuid('id').defaultRandom().primaryKey()`
- `createdAt` / `updatedAt` 타임스탬프 필수
- FK는 `references(() => parentTable.id)` 패턴 사용
- `onDelete` 정책 명시: 종속 데이터는 `cascade`, 참조만 하는 경우 `set null`

## Relations 정의

테이블 추가 시 `relations()` 도 함께 정의한다:

```ts
export const newTableRelations = relations(newTable, ({ one, many }) => ({
  parent: one(parentTable, {
    fields: [newTable.parentId],
    references: [parentTable.id],
  }),
}));
```
