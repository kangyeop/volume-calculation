---
name: server
description: Specialized agent for backend development using NestJS, TypeORM, and MySQL. Handles API endpoints, database entities, business logic, and server-side validation.
model: opus
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

## DB Design Patterns

- **Soft Deletes**: Use `@DeleteDateColumn` for important entities like Projects and Products.
- **Transactions**: Use `DataSource.transaction` or `@Transaction()` decorator for bulk imports and complex packing calculations.
- **Naming Convention**: Use camelCase for class properties and snake_case for database columns (e.g., `@Column({ name: 'project_id' })`).
- **Validation**: Use `class-validator` and `ValidationPipe` for all DTOs.

## API Standards

- **Response Format**: Wrap responses in a standard structure `{ success: boolean, data: T, error?: string }`.
- **Error Handling**: Use NestJS built-in `HttpException` classes.
- **Versioning**: Prefix all routes with `/api`.
- **Bulk Operations**: Always use chunked inserts for bulk imports (e.g., chunks of 500) to avoid database lock issues.
