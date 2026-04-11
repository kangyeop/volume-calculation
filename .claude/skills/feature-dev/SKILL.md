---
name: feature-dev
description: "도넛 큐브 기능 개발 오케스트레이터. 풀스택 기능 구현(백엔드+프론트엔드+QA), 새 도메인 추가, API 추가, 페이지 추가, 엑셀 업로드 기능, DB 스키마 변경을 포함한 개발 작업 전반을 조율. '기능 개발', '기능 추가', '페이지 만들어', 'API 추가', '엑셀 업로드', '도메인 추가' 등의 요청 시 사용. 후속 작업: 결과 수정, 부분 재실행, 업데이트, 보완, 다시 실행, 이전 결과 개선, 버그 수정 요청 시에도 반드시 이 스킬을 사용."
---

# Feature Dev Orchestrator

도넛 큐브의 풀스택 기능 개발을 조율하는 오케스트레이터. 백엔드→프론트엔드→QA 파이프라인을 서브 에이전트로 실행한다.

## 실행 모드: 서브 에이전트

기능 개발은 자연스러운 파이프라인(백엔드→프론트엔드→QA) 구조이며, 각 단계가 이전 단계의 산출물에 강하게 의존한다. 오케스트레이터가 단계별 결과를 다음 에이전트에 전달한다.

## 에이전트 구성

| 에이전트 | subagent_type | 역할 | 참조 스킬 | 출력 |
|---------|--------------|------|----------|------|
| backend-dev | backend-dev | Schema, Service, API Route | db-schema, db-performance | 서버사이드 코드 |
| frontend-dev | frontend-dev | Page, Hook, Component | - | 클라이언트사이드 코드 |
| qa-inspector | qa-inspector | 통합 정합성 검증 | - | 검증 리포트 |

## 워크플로우

### Phase 0: 컨텍스트 확인

1. 사용자 요청 분석 — 어떤 도메인의 어떤 기능인지 파악
2. 기존 코드 확인 — 해당 도메인의 서비스/API/훅/페이지가 이미 존재하는지
3. 실행 모드 결정:
   - **신규 기능**: 전체 파이프라인 실행 (Phase 1→2→3→4)
   - **기존 기능 수정**: 영향받는 레이어의 에이전트만 호출
   - **버그 수정**: 원인 분석 후 해당 에이전트만 호출 → QA 검증
4. 변경 범위 판단:
   - DB 스키마 변경 필요 여부
   - 새 서비스 파일 vs 기존 서비스 수정
   - 새 페이지 vs 기존 페이지 수정
   - 새 훅 vs 기존 훅 수정

### Phase 1: 백엔드 구현

**에이전트:** `backend-dev` (model: opus)

**프롬프트에 포함할 정보:**
- 기능 요구사항 전문
- 변경할 도메인 및 관련 파일 경로
- DB 스키마 변경이 필요하면 `.claude/skills/db-schema.md`를 읽으라는 지시
- 서비스 작성 시 `.claude/skills/db-performance.md`를 읽으라는 지시
- `.claude/agents/backend-dev.md`를 읽고 작업 원칙을 따르라는 지시
- API 응답 shape을 명확히 정의하라는 지시 (프론트엔드 개발자가 사용)

**완료 조건:**
- 스키마 변경 시 `pnpm db:generate` 실행 완료, 생성된 SQL 검토 완료
- 서비스 함수 구현 완료
- API Route Handler 구현 완료
- 타입 정의 완료 (필요 시)

**수집할 정보 (Phase 2 전달용):**
- 생성/수정된 API 엔드포인트 목록 (Method + Path)
- 각 API의 응답 shape
- 새로 정의된 타입

### Phase 2: 프론트엔드 구현

**에이전트:** `frontend-dev` (model: opus)

**프롬프트에 포함할 정보:**
- 기능 요구사항 전문
- Phase 1에서 수집한 API 엔드포인트 + 응답 shape
- 변경할 도메인 및 관련 파일 경로
- `.claude/agents/frontend-dev.md`를 읽고 작업 원칙을 따르라는 지시
- 같은 도메인의 기존 페이지/훅 패턴을 참고하라는 지시

**완료 조건:**
- React Query 훅 구현 완료 (API 응답 타입과 일치)
- 페이지/컴포넌트 구현 완료
- 쿼리 키 팩토리에 새 키 등록 (필요 시)
- 배럴 export 업데이트 (필요 시)

### Phase 3: QA 검증

**에이전트:** `qa-inspector` (model: opus)

**프롬프트에 포함할 정보:**
- Phase 1, 2에서 생성/수정된 파일 목록
- 기능 요구사항 (스펙 준수 검증용)
- `.claude/agents/qa-inspector.md`를 읽고 검증 방법을 따르라는 지시
- `pnpm build` 및 `pnpm lint` 실행 지시

**검증 실패 시:**
1. QA 리포트에서 실패 항목과 수정 방안을 추출
2. 해당 레이어의 에이전트(backend-dev 또는 frontend-dev)를 재호출하여 수정
3. 수정 후 QA 재검증 (최대 2회 반복)
4. 2회 재시도 후에도 실패하면 사용자에게 보고

### Phase 4: 문서 동기화

오케스트레이터가 직접 수행한다 (에이전트 호출 불필요):

CLAUDE.md의 Docs 동기화 매핑 테이블을 참조하여:
- `schema.ts` 변경 → `docs/db-schema.md` + 관련 domain 문서 업데이트
- API 추가/변경 → 관련 domain 문서 API 섹션 업데이트
- 서비스 파일 추가 → 관련 domain 문서 + `docs/architecture.md` 업데이트
- 페이지 추가 → `docs/architecture.md` + 관련 domain 문서 업데이트

문서 작성 시 `.claude/skills/domain-docs.md` 스킬을 참고한다.

## 데이터 흐름

```
[오케스트레이터]
    │
    ├─ Phase 1 ─→ Agent(backend-dev, model=opus)
    │                 │
    │                 └─→ 반환: API 엔드포인트 + 응답 shape + 변경 파일 목록
    │
    ├─ Phase 2 ─→ Agent(frontend-dev, model=opus)
    │                 │  (입력: Phase 1 결과 + 요구사항)
    │                 └─→ 반환: 변경 파일 목록
    │
    ├─ Phase 3 ─→ Agent(qa-inspector, model=opus)
    │                 │  (입력: Phase 1+2 변경 파일 목록)
    │                 └─→ 반환: 검증 리포트
    │                       │
    │                       ├─ 통과 → Phase 4
    │                       └─ 실패 → 해당 에이전트 재호출 → QA 재검증
    │
    └─ Phase 4 ─→ 오케스트레이터 직접 문서 동기화
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| backend-dev 실패 | 에러 분석 후 1회 재시도. 재실패 시 사용자에게 보고 |
| frontend-dev 실패 | 에러 분석 후 1회 재시도. 재실패 시 사용자에게 보고 |
| QA 실패 항목 발견 | 해당 레이어 에이전트 재호출하여 수정 → QA 재검증 (최대 2회) |
| `pnpm build` 실패 | 에러 메시지 분석 → 해당 에이전트 재호출 |
| DB 마이그레이션 위험 | 사용자에게 SQL 검토 요청, 승인 없이 진행하지 않음 |

## 스킵 가능한 Phase

모든 Phase가 필수는 아니다. 변경 범위에 따라 불필요한 Phase를 스킵한다:

| 변경 유형 | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|----------|---------|---------|---------|---------|
| 백엔드만 (API 추가) | 필수 | 스킵 | 필수 | 필수 |
| 프론트엔드만 (UI 수정) | 스킵 | 필수 | 필수 | 필요 시 |
| 풀스택 기능 | 필수 | 필수 | 필수 | 필수 |
| DB 스키마만 | 필수 | 스킵 | 스킵 | 필수 |
| 버그 수정 | 필요 시 | 필요 시 | 필수 | 필요 시 |

## 테스트 시나리오

### 정상 흐름: 새 도메인 기능 추가
1. 사용자가 "새 도메인 X의 CRUD 기능 만들어줘" 요청
2. Phase 0: 해당 도메인 파일 미존재 확인 → 전체 파이프라인 실행 결정
3. Phase 1: backend-dev가 schema + service + API 구현
4. Phase 2: frontend-dev가 hook + page 구현
5. Phase 3: qa-inspector가 API↔훅 타입 일치, 라우팅 정합성, 빌드 통과 검증
6. Phase 4: docs/domain/x.md 생성, architecture.md 업데이트
7. 결과: 풀스택 CRUD 기능 + 문서 완성

### 에러 흐름: QA에서 타입 불일치 발견
1. Phase 3에서 QA가 "API가 `{ items: Order[] }` 반환, 훅이 `Order[]` 기대" 발견
2. 오케스트레이터가 frontend-dev를 재호출: "훅에서 `.items`로 unwrap하라"
3. frontend-dev가 수정
4. QA 재검증 → 통과
5. Phase 4로 진행
