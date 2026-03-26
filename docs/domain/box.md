# Box 도메인

패킹에 사용할 박스 마스터 데이터를 관리하는 도메인. 박스는 독립적으로 생성·관리되며, 박스 그룹에 선택적으로 할당하여 패킹 시 사용한다.

## 데이터 모델

### BoxGroup

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| userId | UUID, nullable | 소유자 (auth.users) |
| name | varchar(255) | 그룹 이름 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**관계:** BoxGroup 0..1 : N Box (SET NULL — 그룹 삭제 시 소속 박스의 boxGroupId가 NULL로 변경, 박스 데이터 보존)

### Box

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| userId | UUID, nullable | 소유자 (auth.users) |
| name | varchar(255) | 박스 이름 |
| boxGroupId | UUID (FK → boxGroups, nullable) | 소속 그룹 (SET NULL) |
| width | numeric(10,2) | 가로 (cm) |
| length | numeric(10,2) | 세로 (cm) |
| height | numeric(10,2) | 높이 (cm) |
| price | numeric(10,2), nullable | 가격 |
| stock | integer, default 0 | 재고 수량 (수동 관리) |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**관계:** Box N : 0..1 BoxGroup, Box 1 : N BoxStockHistory

### BoxStockHistory

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| boxId | UUID (FK → boxes, CASCADE) | 대상 박스 |
| type | stock_change_type | 변동 유형 (INBOUND/OUTBOUND/INITIAL/ADJUSTMENT) |
| quantity | integer | 부호 있는 변동량 (+ 증가, - 감소) |
| resultStock | integer | 변동 후 최종 재고 |
| note | text, nullable | 변경 사유 메모 |
| createdAt | timestamp | |

**관계:** BoxStockHistory N : 1 Box (CASCADE DELETE)

## 페이지

| 경로 | 기능 |
|------|------|
| `/boxes` | 박스 독립 목록 (전체/미할당 필터, 삭제) |
| `/boxes/new` | 박스 생성 (단건 폼 + 엑셀 업로드) |
| `/boxes/[id]` | 박스 수정 (이름, 치수, 가격) + 재고 이력 관리 |
| `/box-groups` | 박스 그룹 목록 (그룹명, 박스 수, 생성일, 삭제) |
| `/box-groups/new` | 박스 그룹 생성 (그룹명 + 기존 박스 선택) |
| `/box-groups/[id]` | 박스 그룹 상세 (소속 박스 관리 — 할당/해제) |

### 박스 목록 (`/boxes`) 주요 기능

- **전체/미할당 필터**: 탭으로 전체 박스 또는 미할당(boxGroupId = NULL) 박스만 표시
- **테이블 컬럼**: 박스명, 크기(W×L×H), CBM, 가격, 재고, 소속 그룹, 삭제
- **미할당 표시**: 그룹 미할당 박스는 "미할당" 뱃지로 구분

### 박스 그룹 생성 (`/box-groups/new`) 주요 기능

- **박스 선택 UI**: 체크박스 목록으로 기존 박스를 선택하여 그룹에 할당
- **미할당 우선 정렬**: 미할당 박스가 상단에 표시

### 박스 그룹 상세 (`/box-groups/[id]`) 주요 기능

- **할당 관리**: 체크박스 UI로 박스 추가/제거

## API

### 박스

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/boxes` | 전체 박스 목록 |
| GET | `/api/boxes?unassigned=true` | 미할당 박스 목록 |
| POST | `/api/boxes` | 박스 생성 (boxGroupId optional) |
| GET | `/api/boxes/{id}` | 박스 상세 |
| PATCH | `/api/boxes/{id}` | 박스 수정 |
| DELETE | `/api/boxes/{id}` | 박스 삭제 |
| POST | `/api/boxes/upload` | 엑셀 업로드 (groupId query param optional) |
| GET | `/api/boxes/{id}/stock-histories` | 박스 재고 이력 목록 |
| POST | `/api/boxes/{id}/stock-histories` | 재고 변동 등록 (type, quantity, note?) |

### 박스 그룹

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/box-groups` | 전체 그룹 목록 (소속 박스 포함) |
| POST | `/api/box-groups` | 그룹 생성 (name, boxIds optional) |
| GET | `/api/box-groups/{id}` | 그룹 상세 (소속 박스 포함) |
| PATCH | `/api/box-groups/{id}` | 그룹 박스 할당 변경 (boxIds) |
| DELETE | `/api/box-groups/{id}` | 그룹 삭제 (소속 박스 보존, boxGroupId → NULL) |

## 비즈니스 로직

### 박스 독립 관리

박스는 BoxGroup 없이 독립적으로 생성·수정·삭제 가능하다. 미할당 박스(boxGroupId = NULL)는 패킹 계산에서 자동 제외된다.

### 박스 그룹 할당

- 하나의 박스는 최대 하나의 그룹에 속할 수 있다 (1:N)
- `updateBoxAssignments(groupId, boxIds)`는 트랜잭션 내에서 실행: 기존 할당 해제 → 새 할당
- 이미 다른 그룹에 속한 박스를 선택하면 기존 그룹에서 자동 해제 후 새 그룹에 할당

### 엑셀 업로드 (고정 컬럼)

| 엑셀 컬럼명 | 매핑 필드 | 설명 |
|-------------|----------|------|
| 박스명 | name | 박스 이름 |
| 가로 | width | 가로 (cm) |
| 세로 | length | 세로 (cm) |
| 높이 | height | 높이 (cm) |
| 가격 | price | 가격 (optional) |
| 재고 | stock | 재고 수량 (optional) |

groupId 없이 업로드하면 미할당 박스로 생성된다.

### 재고 이력 관리

재고는 편집 폼에서 직접 수정할 수 없으며, 반드시 재고 이력(BoxStockHistory)을 통해서만 변경된다.

| 유형 | 설명 | quantity 계산 |
|------|------|--------------|
| INBOUND (입고) | 재고 입고 | delta = +수량, result = 현재 + 수량 |
| OUTBOUND (출고) | 재고 출고 | delta = -수량, result = 현재 - 수량 |
| INITIAL (초기 등록) | 초기 재고 설정 | delta = 목표 - 현재, result = 목표 |
| ADJUSTMENT (수정) | 재고 보정 | delta = 목표 - 현재, result = 목표 |

- 이력 생성과 재고 업데이트는 트랜잭션 내에서 원자적으로 처리
- OUTBOUND 시 결과 재고가 음수이면 에러
- 이력 레코드는 불변(immutable) — 수정·삭제 불가

### 패킹 연동 경로

패킹 시 박스 조회 체인: `ProductGroup.boxGroupId → boxesService.findByGroupId(bgId) → Box[]`

## 다른 도메인과의 연관

| 연관 도메인 | 관계 |
|-------------|------|
| **Product** | 상품 그룹(ProductGroup)이 박스 그룹(BoxGroup)을 참조하여 패킹 시 사용할 박스를 결정 |
| **Packing** | 박스 치수(W×L×H)를 패킹 알고리즘에서 부피 기반 박스 선택에 사용. 미할당 박스는 패킹에서 제외. 패킹 결과에 박스별 재고 수량 표시 (자동 차감 없음) |

## 주요 파일

| 파일 | 역할 |
|------|------|
| `src/lib/db/schema.ts` | DB 스키마 (boxGroups, boxes) |
| `src/lib/services/boxes.ts` | 박스 CRUD, 엑셀 업로드, 할당/해제 서비스 |
| `src/lib/services/box-stock-histories.ts` | 재고 이력 생성 (트랜잭션), 조회 서비스 |
| `src/lib/services/box-groups.ts` | 박스 그룹 서비스 (생성, 할당 변경, 삭제) |
| `src/lib/api.ts` | 프론트엔드 API 클라이언트 |
| `src/hooks/queries/useBoxes.ts` | React Query 훅 (박스) |
| `src/hooks/queries/useBoxStockHistories.ts` | React Query 훅 (재고 이력) |
| `src/hooks/queries/useBoxGroups.ts` | React Query 훅 (박스 그룹) |
| `src/app/(main)/boxes/` | 박스 UI 페이지 |
| `src/app/(main)/box-groups/` | 박스 그룹 UI 페이지 |
| `src/app/api/boxes/` | 박스 API 라우트 |
| `src/app/api/box-groups/` | 박스 그룹 API 라우트 |
