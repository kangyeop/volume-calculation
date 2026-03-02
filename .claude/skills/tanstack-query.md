---
name: tanstack-query
description: TanStack Query (React Query) patterns and best practices for data fetching and state management
---

# TanStack Query

TanStack Query is a powerful data synchronization library for React that handles caching, synchronization, and server state management.

## Installation

```bash
pnpm add @tanstack/react-query @lukemorales/query-key-factory
```

## Setup

Configure QueryClient at app root:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
```

## Project Structure

```bash
src/hooks/queries/
├── queryKeys.ts       # Query key factories
├── useProjects.ts     # Project-related queries
├── useProducts.ts     # Product-related queries
├── useOutbounds.ts    # Outbound-related queries
├── useBoxes.ts        # Box-related queries
├── usePacking.ts     # Packing-related queries
└── index.ts          # Barrel export
```

## Query Keys with query-key-factory

Create typed query keys using `createQueryKeys`:

```ts
import { createQueryKeys } from '@lukemorales/query-key-factory';

export const projects = createQueryKeys('projects', {
  all: null,
  detail: (id: string) => [id],
});

export const products = createQueryKeys('products', {
  all: (projectId: string) => [projectId],
});

export const todos = createQueryKeys('todos', {
  detail: (todoId: string) => [todoId],
  list: (filters: TodoFilters) => ({
    queryKey: [{ filters }],
    queryFn: (ctx) => api.getTodos({ filters, page: ctx.pageParam }),
  }),
});
```

Generated keys follow TanStack Query convention:

- `projects.all.queryKey` → `['projects']`
- `projects.detail('123').queryKey` → `['projects', 'detail', '123']`
- `products.all('proj-1').queryKey` → `['products', 'proj-1']`

## Core Hooks

### useQuery

Fetch and cache data:

```tsx
import { useQuery } from '@tanstack/react-query';
import { projects } from './queryKeys';

function ProjectsList() {
  const { data, isLoading, error } = useQuery({
    ...projects.all,
    queryFn: () => fetch('/api/projects').then((res) => res.json()),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return (
    <div>
      {data?.map((p) => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  );
}
```

### useMutation

Perform data mutations with automatic cache invalidation:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projects } from './queryKeys';

function CreateProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (name: string) =>
      fetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projects.all._def });
    },
  });

  return <button onClick={() => mutation.mutate('New Project')}>Create</button>;
}
```

## Best Practices

1. Organize query keys by domain (projects, products, etc.)
2. Use `createQueryKeys` from `@lukemorales/query-key-factory` for type safety
3. Export all query keys and hooks from a barrel `index.ts`
4. Use `...keyFactory.all()` spread to get `queryKey` property
5. Use `keyFactory.all._def` to invalidate all queries of a domain
6. Use appropriate `staleTime` based on data volatility
7. Handle loading and error states consistently
8. Use `enabled` option for conditional queries

## Domain Files Example

```tsx
// useProjects.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { projects } from './queryKeys';

export function useProjects() {
  return useQuery({
    ...projects.all,
    queryFn: () => api.projects.list(),
  });
}

export function useProject(id: string) {
  return useQuery({
    ...projects.detail(id),
    queryFn: () => api.projects.get(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }) => api.projects.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projects.all._def });
    },
  });
}
```
