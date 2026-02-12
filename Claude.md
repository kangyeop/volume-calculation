# AI Agent Specification

This project is a Monorepo using Turbo, NestJS, React, and MySQL.

## Structure
- `apps/server`: NestJS backend
- `apps/web`: React frontend
- `packages/types`: Shared types

## Tech Stack
- **Package Manager**: pnpm
- **Monorepo**: Turbo
- **Backend**: NestJS, TypeORM, MySQL
- **Frontend**: React, Vite, TailwindCSS, Lucide React
- **Testing**: Jest

## Guidelines
- Follow the specific agent rules in `.claude/agents/`
- Run hooks in `.claude/hooks/` after development
- **No Comments**: Do not add comments to the code. Code should be self-documenting. Only add comments if the logic is extremely complex and cannot be simplified.

## Agent Guidelines
- **server**: Use for all backend tasks including API design, database schema changes (TypeORM), and business logic implementation in `apps/server`.
- **web**: Use for all frontend tasks including UI component creation, styling (TailwindCSS), and client-side state management in `apps/web`.
- **general**: Use for project-level configuration, shared types in `packages/types`, or tasks involving both ends (e.g., full-stack feature integration).
- **planner**: Use for architectural planning, requirements analysis, and task breakdown. Focuses on high-level design and implementation strategies across the monorepo.
- **qa**: Use for testing strategy, writing test cases, and executing tests using Jest. Handles unit tests, integration tests, and end-to-end scenarios.
