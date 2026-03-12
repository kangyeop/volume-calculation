# WMS Monorepo

이 저장소를 빠르게 파악하려면 먼저 [docs/README.md](/Users/yeop/dev/wms/docs/README.md)를 보는 것을 권장합니다.

핵심 문서:

- [문서 인덱스](/Users/yeop/dev/wms/docs/README.md)
- [프로젝트 개요](/Users/yeop/dev/wms/docs/01-프로젝트-개요.md)
- [구조와 실행 흐름](/Users/yeop/dev/wms/docs/02-구조와-실행-흐름.md)
- [현재 스펙](/Users/yeop/dev/wms/docs/03-현재-스펙.md)

## 실행

```bash
pnpm install
docker compose up -d
pnpm dev
```

개별 실행:

```bash
pnpm dev:server
pnpm dev:web
```

## 주요 기술 스택

- 모노레포: `pnpm` + `turbo`
- 백엔드: NestJS + TypeORM + MySQL
- 프론트엔드: React + Vite + TanStack Query
- 공통 타입: `packages/types`

## 참고

- 기존 상세 분석 문서는 루트에 남겨두고, 실제 프로젝트 파악용 최신 정리본은 `docs/` 아래에 둡니다.
