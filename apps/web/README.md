# WMS Web

Code-verified on 2026-03-12.

This app is the React frontend for project creation, product import, outbound import, packing calculation, and result review.

## Stack

- React 19
- React Router 7
- TanStack Query 5
- Vite 7

## Run

From the repo root:

```bash
pnpm dev:web
```

Or from this package:

```bash
pnpm dev
```

## Route Map

- `/`: project list and project creation
- `/boxes`: global box manager
- `/projects/:id`: project dashboard
- `/projects/:id/products`: product Excel upload and deletion
- `/projects/:id/outbound`: outbound Excel upload
- `/projects/:id/outbound/list`: grouped outbound inspection and per-order packing
- `/projects/:id/packing`: grouped packing calculation
- `/projects/:id/packing/summary`: grouped box summary

## Data Access

Server state is handled through:

- `src/lib/api.ts`
- `src/hooks/queries/*`

Shared contracts come from `@wms/types`.

## Current Workflow Notes

- product import goes through `product-upload/parse` then `product-upload/confirm`
- outbound upload currently uses the direct-save path `upload/outbound-direct`
- grouped packing summary is navigated from outbound list or packing calculator
- box configuration is global for all projects

## Validation

From the repo root:

```bash
pnpm --filter web build
pnpm --filter web exec playwright test
```
