# 도넛 큐브

Next.js 15 (App Router) + Supabase PostgreSQL 풀스택 앱. 출고 박스 패킹 최적화 시스템.

## Docs

- [프로젝트 개요](docs/PROJECT_OVERVIEW.md) — 목적, 비즈니스 로직, 사용자 플로우
- [시스템 아키텍처](docs/architecture.md) — 기술 스택, 디렉토리 구조, API 라우트
- [DB 스키마](docs/db-schema.md) — ER 다이어그램 (Mermaid), Enum, 인덱스, 관계 요약
- `docs/domain/` — 도메인별 문서 (아래 규칙 참고)

## Commands

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` / `pnpm type-check`
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:studio`

## Guidelines

- Follow the specific agent rules in `.claude/agents/`
- Follow the specific skill rules in `.claude/skills/`
- Run hooks in `.claude/hooks/` after development
- **No Comments**: Do not add comments to the code. Code should be self-documenting. Only add comments if the logic is extremely complex and cannot be simplified.
- **DB 변경**: 스키마 수정 시 반드시 `.claude/skills/db-schema.md` 스킬을 따른다. `db:push` 사용 금지. 항상 `db:generate` → SQL 검토 → `db:migrate` 워크플로우를 사용한다. 테이블/컬럼 rename 시 생성된 SQL에서 DROP→ALTER RENAME으로 수동 교체 필수.
- **Docs 동기화**: 기능 추가·변경·삭제 작업 후 `docs/domain/` 하위의 관련 도메인 문서에 변경점을 반영한다. 해당하는 문서가 없으면 생략. 작성 규칙은 `.claude/skills/domain-docs.md` 참고. DB 스키마 변경 시 `docs/db-schema.md`, 아키텍처 변경 시 `docs/architecture.md`도 함께 업데이트한다.

### Docs 동기화 매핑

| 코드 변경 | 반드시 업데이트할 문서 |
|-----------|---------------------|
| `src/lib/db/schema.ts` | `docs/db-schema.md` + 관련 domain 문서의 데이터 모델 섹션 |
| `src/app/api/**` 라우트 추가/삭제/변경 | 관련 domain 문서의 API 섹션 |
| `src/lib/services/**` 파일 추가/삭제 | 관련 domain 문서의 주요 파일 + `docs/architecture.md` 디렉토리 구조 |
| `src/app/(main)/**` 페이지 추가/삭제 | `docs/architecture.md` 프론트엔드 라우트 + 관련 domain 문서의 페이지 섹션 |
| `src/hooks/**` 파일 추가/삭제 | `docs/architecture.md` 디렉토리 구조 + 관련 domain 문서의 주요 파일 |
| `src/components/**` 디렉토리 추가/삭제 | `docs/architecture.md` 디렉토리 구조 |

## Env

Set in `.env.local`: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
