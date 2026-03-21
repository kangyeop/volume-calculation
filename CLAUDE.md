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
- **Docs 동기화**: 기능 추가·변경·삭제 작업 후 `docs/domain/` 하위의 관련 도메인 문서에 변경점을 반영한다. 해당하는 문서가 없으면 생략.
- **도메인 문서 작성 규칙** (`docs/domain/{도메인명}.md`):
  - 첫 줄: `# {도메인명} 도메인` + 한 줄 요약
  - 필수 섹션 (순서 고정): `데이터 모델` → `페이지` → `API` → `비즈니스 로직` → `다른 도메인과의 연관` → `주요 파일`
  - 데이터 모델: 테이블별 컬럼 테이블 (`컬럼 | 타입 | 설명`) + 관계 설명
  - 페이지: `경로 | 기능` 테이블 + 주요 기능 상세 (필요 시)
  - API: `Method | Endpoint | 설명` 테이블, 기능 단위로 그룹핑
  - 비즈니스 로직: 핵심 규칙, 처리 흐름
  - 다른 도메인과의 연관: `연관 도메인 | 관계` 테이블
  - 주요 파일: `파일 | 역할` 테이블
  - 해당 도메인에 없는 섹션은 생략 가능

## Env

Set in `.env.local`: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `OPENAI_API_KEY`
