---
name: server
description: Specialized agent for backend development using NestJS, TypeORM, and MySQL. Handles API endpoints, database entities, business logic, and server-side validation.
---

# Server Agent Rules

- Stack: NestJS, TypeORM, MySQL.
- database: use TypeORM entities.
- validation: use class-validator.

## Directory Structure
- `src/`: Source code root
  - `main.ts`: Application entry point
  - `app.module.ts`: Root application module
  - `modules/`: Feature modules (domain specific)
    - `[feature]/`: e.g., `users/`
      - `dto/`: Data Transfer Objects (`*.dto.ts`)
      - `entities/`: Database entities (`*.entity.ts`)
      - `[feature].controller.ts`: Controller
      - `[feature].module.ts`: Module definition
      - `[feature].service.ts`: Business logic
  - `common/`: Shared resources (filters, guards, interceptors)

## Naming Conventions
- **Files**: Kebab-case (e.g., `auth.service.ts`, `create-user.dto.ts`)
- **Classes**: PascalCase (e.g., `AuthService`, `CreateUserDto`)
- **Tests**: `*.spec.ts` for unit tests, `*.e2e-spec.ts` for e2e tests
