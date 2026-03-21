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

1. `src/lib/db/schema.ts` 수정
2. `pnpm db:generate` 실행 → `drizzle/` 폴더에 migration SQL 생성
3. 생성된 SQL 파일 검토 (destructive 변경 여부 확인)
4. `pnpm db:push` 로 Supabase에 반영 (사용자 확인 후)

## 하위호환성 규칙

### 안전한 변경 (바로 적용 가능)
- 새 테이블 추가
- 기존 테이블에 nullable 컬럼 추가
- 기존 테이블에 default 값이 있는 컬럼 추가
- 새 인덱스 추가
- 새 enum 값 추가 (기존 값 뒤에)

### 위험한 변경 (사용자 확인 필수)
- 컬럼 삭제 → 기존 데이터 유실
- 컬럼 타입 변경 → 데이터 변환 실패 가능
- NOT NULL 제약 추가 → 기존 null 데이터가 있으면 실패
- enum 값 삭제/변경 → 해당 값을 쓰는 행이 있으면 실패
- 테이블 이름 변경 → 모든 참조 코드 수정 필요
- unique 제약 추가 → 기존 중복 데이터가 있으면 실패

### 위험한 변경 시 안전한 패턴

**컬럼 이름 변경**: 새 컬럼 추가 → 데이터 복사 → 이전 컬럼 삭제 (2단계 마이그레이션)

**NOT NULL 추가**: default 값과 함께 추가하거나, 먼저 nullable로 추가 후 데이터 채운 뒤 NOT NULL 전환

**컬럼 삭제**: 코드에서 먼저 해당 컬럼 참조 제거 → 배포 → 이후 컬럼 삭제

## 스키마 작성 패턴

이 프로젝트에서 사용하는 공통 패턴:

```ts
export const newTable = pgTable('new_table', {
  id: uuid('id').defaultRandom().primaryKey(),
  // 비즈니스 컬럼들
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

## 마이그레이션 생성 후 확인사항

`pnpm db:generate` 실행 후 생성된 SQL 파일에서 다음을 확인:

- `DROP` 문이 포함되어 있지 않은지
- `ALTER COLUMN ... SET NOT NULL` 이 있다면 기존 데이터에 null이 없는지
- `ALTER TYPE` (enum 변경)이 있다면 안전한 방향인지 (값 추가만 허용)
- 의도하지 않은 변경이 포함되어 있지 않은지
