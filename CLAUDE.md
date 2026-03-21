# AI Agent Specification

This project is a Next.js 15 full-stack application (App Router) with Supabase PostgreSQL.

## Structure

- `src/app/`: Next.js App Router pages and API routes
- `src/components/`: React UI components
- `src/hooks/`: Custom React hooks
- `src/lib/`: Services, database, utilities
- `src/types/`: Shared TypeScript types

## Tech Stack

- **Package Manager**: pnpm
- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase PostgreSQL, Drizzle ORM
- **Frontend**: React 19, TailwindCSS, Radix UI, Jotai, React Query
- **AI**: OpenAI SDK (direct)
- **File Storage**: Supabase Storage

## Guidelines

- Follow the specific agent rules in `.claude/agents/`
- Run hooks in `.claude/hooks/` after development
- **No Comments**: Do not add comments to the code. Code should be self-documenting. Only add comments if the logic is extremely complex and cannot be simplified.

## Development Commands

- **Dev**: `pnpm dev`
- **Build**: `pnpm build`
- **Start**: `pnpm start`
- **Lint**: `pnpm lint`
- **Type Check**: `pnpm type-check`
- **DB Generate**: `pnpm db:generate`
- **DB Push**: `pnpm db:push`
- **DB Studio**: `pnpm db:studio`

## Database

- **Provider**: Supabase PostgreSQL
- **ORM**: Drizzle ORM
- **Config**: Set `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
