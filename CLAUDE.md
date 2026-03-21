# dnut VC

Next.js 15 (App Router) + Supabase PostgreSQL 풀스택 앱. 출고 박스 패킹 최적화 시스템.

## Docs

- [프로젝트 개요](docs/PROJECT_OVERVIEW.md) — 목적, 비즈니스 로직, 사용자 플로우
- [시스템 아키텍처](docs/architecture.md) — 기술 스택, 디렉토리 구조, ER 다이어그램, API 라우트

## Commands

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` / `pnpm type-check`
- `pnpm db:generate` / `pnpm db:push` / `pnpm db:studio`

## Guidelines

- Follow the specific agent rules in `.claude/agents/`
- Run hooks in `.claude/hooks/` after development
- **No Comments**: Do not add comments to the code. Code should be self-documenting. Only add comments if the logic is extremely complex and cannot be simplified.

## Env

Set in `.env.local`: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `OPENAI_API_KEY`
