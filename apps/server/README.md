# WMS Server

Code-verified on 2026-03-12.

This app is the NestJS backend for project management, Excel import, AI mapping, packing calculation, and packing result export.

## Stack

- NestJS 11
- TypeORM + MySQL
- `typeorm-transactional`
- LangChain + OpenAI

## Run

From the repo root:

```bash
pnpm dev:server
```

Or from this package:

```bash
pnpm dev
```

## Main Modules

- `projects`: project CRUD
- `products`: product CRUD and bulk insert
- `orders`: order lookup and volume helpers
- `outbound`: outbound CRUD
- `upload`: outbound Excel parsing and direct import
- `product-upload`: product Excel parsing and confirm import
- `packing`: grouped and per-order packing
- `boxes`: global box CRUD
- `ai`: OpenAI-backed mapping

## Environment

- `OPENAI_API_KEY`: required for AI-assisted mapping
- `DB_HOST`: defaults to `localhost`
- `PRODUCT_CACHE_TTL`: defaults to `3600000`
- `PORT`: defaults to `3000`

The database defaults are currently hard-coded to:

- host: `localhost` unless `DB_HOST` is set
- port: `3306`
- username: `root`
- password: `root`
- database: `wms`

## API Notes

All routes are exposed under `/api`.

Important routes:

- `/projects`
- `/projects/:projectId/products`
- `/projects/:projectId/outbounds`
- `/upload/*`
- `/product-upload/*`
- `/projects/:projectId/packing/*`
- `/boxes`

## Current Implementation Notes

- full-project packing calculation deletes and recreates stored packing results
- direct outbound upload removes existing project outbounds before saving replacements
- product import bulk-upserts by `(projectId, sku)`
- order-level packing is summary-level only; placement arrays are empty

## Tests

From the repo root:

```bash
pnpm --filter server test
pnpm --filter server test:e2e
```
