# dnut VC

Next.js 15 (App Router) + Supabase PostgreSQL 풀스택 앱. 출고 박스 패킹 최적화 시스템.

## Docs

- [프로젝트 개요](docs/PROJECT_OVERVIEW.md) — 목적, 비즈니스 로직, 사용자 플로우
- [시스템 아키텍처](docs/architecture.md) — 기술 스택, 디렉토리 구조, ER 다이어그램, API 라우트
- `docs/domain/` — 도메인별 문서 (아래 규칙 참고)

## Commands

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` / `pnpm type-check`
- `pnpm db:generate` / `pnpm db:push` / `pnpm db:studio`

## Guidelines

- Follow the specific agent rules in `.claude/agents/`
- Follow the specific skill rules in `.claude/skills/`
- Run hooks in `.claude/hooks/` after development
- **No Comments**: Do not add comments to the code. Code should be self-documenting. Only add comments if the logic is extremely complex and cannot be simplified.
- **DB 변경**: 스키마 수정 시 `.claude/skills/db-schema.md` 규칙을 반드시 따른다. 변경 후 `pnpm db:generate`로 마이그레이션 생성 필수.
- **Docs 동기화**: 기능 추가·변경·삭제 작업 후 `docs/domain/` 하위의 관련 도메인 문서에 변경점을 반영한다. 해당하는 문서가 없으면 생략. 작성 규칙은 `.claude/skills/domain-docs.md` 참고.

## Env

Set in `.env.local`: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `OPENAI_API_KEY`
