# dnut VC

출고 박스 패킹 최적화 시스템. 상품 부피와 박스 규격을 기반으로 최적의 패킹 조합을 계산합니다.

## 기술 스택

- **프레임워크**: Next.js 15 (App Router)
- **프론트엔드**: React 19, TailwindCSS, Radix UI
- **상태 관리**: TanStack React Query, Jotai
- **데이터베이스**: Supabase PostgreSQL (Drizzle ORM)
- **파일 저장소**: Supabase Storage
- **엑셀 처리**: ExcelJS, SheetJS

## 실행

```bash
pnpm install
pnpm dev
```

## 주요 명령어

```bash
pnpm dev              # 개발 서버
pnpm build            # 프로덕션 빌드
pnpm lint             # ESLint
pnpm type-check       # 타입 체크
pnpm db:generate      # Drizzle 마이그레이션 생성
pnpm db:migrate       # 마이그레이션 적용
pnpm db:studio        # Drizzle Studio (DB GUI)
```

## 환경 변수

`.env.local`에 설정:

| 변수 | 용도 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 클라이언트 키 |
| `SUPABASE_SECRET_KEY` | Supabase 서버 키 |

## 문서

- [시스템 아키텍처](docs/architecture.md)
- [DB 스키마](docs/db-schema.md)
- [도메인별 문서](docs/domain/)
