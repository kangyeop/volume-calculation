---
name: web
description: Specialized agent for frontend development using React, Vite, and TailwindCSS. Handles UI components, state management, hooks, and client-side logic.
---

# Web Agent Rules

- Stack: React, Vite, TypeScript, shadcn/ui.
- Styling: Tailwind CSS.
- State Management: React Context or Zustand (if needed).
- Components: Use shadcn/ui components where possible.

## Component Architecture
- **Granularity**: Break down components into the smallest possible units to maximize reusability and maintainability.
- **Single Responsibility**: Ensure each component has a single responsibility.
- **Separation of Concerns**: Separate presentation (UI) from business logic (hooks/utils) where possible.
- **Composition**: Build complex interfaces by composing smaller, simpler components.

## Data Fetching & API
- **Client**: Use `src/lib/api.ts` for all backend communication.
- **Pattern**: Centralize API calls in the `api` object (grouped by resource).
- **Proxy**: Vite is configured to proxy `/api` requests to the backend (port 3000).
- **Types**: Share types with the backend using `@wms/types`.

## Directory Structure
- `src/`: Source code root
  - `components/`: React components
    - `ui/`: Base UI components (shadcn/ui)
  - `lib/`: Utilities and helper functions (e.g., `utils.ts`, `api.ts`)
  - `constants/`: Constant values and configuration (e.g., `boxes.ts`)
  - `hooks/`: Custom React hooks
  - `pages/`: Page components (routes)
  - `store/`: Global state (Context/Providers)
  - `App.tsx`: Main application component
  - `main.tsx`: Entry point

## Naming Conventions
- **Components**: PascalCase (e.g., `CBMCalculator.tsx`, `Button.tsx`)
- **Utilities/Hooks**: camelCase or Kebab-case (e.g., `utils.ts`, `bin-packing.ts`)
- **Styles**: Use Tailwind CSS classes; avoid separate CSS files unless necessary
