# 견적서 도메인 (Estimates)

견적서 PDF 파일을 업로드하고 관리하는 도메인. 사용자가 견적서 이름과 PDF 파일을 등록하면, 이름으로 검색하고 클릭 시 PDF를 브라우저 내장 뷰어로 표시한다.

## 핵심 개념

### 보안 모델

- 업로드한 사용자만 해당 견적서를 열람/삭제할 수 있다
- PDF 파일은 Supabase Storage의 private 버킷에 저장
- 모든 접근은 서버 사이드 Admin Client signed URL을 통해 이루어짐 (300초 TTL)
- Storage에 RLS 정책을 사용하지 않으며, 서비스 레이어에서 userId 필터링으로 접근 제어 (기존 프로젝트 패턴 준수)

### 파일 검증

업로드 시 서버에서 3단계 검증을 수행:
1. MIME type이 `application/pdf`인지 확인
2. 파일 첫 5바이트가 `%PDF-` magic bytes인지 확인
3. 파일 크기가 10MB 이하인지 확인

### Storage 경로

`estimates/{userId}/{uuid}.pdf` — userId를 경로에 포함하여 물리적 격리

## 데이터 모델

### estimates 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid (PK) | 견적서 ID |
| `user_id` | uuid | 소유자 ID |
| `name` | varchar(255) | 견적서 이름 |
| `file_name` | varchar(255) | 원본 파일명 |
| `storage_path` | text | Supabase Storage 내 경로 |
| `file_size` | integer | 파일 크기 (바이트) |
| `created_at` | timestamp | 생성일 |
| `updated_at` | timestamp | 수정일 |

인덱스: `estimates_user_id_idx` on `user_id`

## API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/estimates?search=keyword` | 목록 조회 + 이름 검색 |
| POST | `/api/estimates` (FormData: name, file) | 견적서 업로드 (201) |
| DELETE | `/api/estimates/[id]` | 견적서 삭제 (204) |
| GET | `/api/estimates/[id]/signed-url` | PDF signed URL 발급 |

### 에러 응답

| 상황 | 상태 코드 |
|------|-----------|
| name/file 누락 | 400 |
| 잘못된 PDF (MIME/magic bytes) | 400 |
| 파일 크기 초과 (>10MB) | 400 |
| 타인의 견적서 접근 | 404 |

## 페이지

| 경로 | 설명 |
|------|------|
| `/estimates` | 견적서 목록: 검색 (debounced), 업로드 폼, 목록 (이름/파일명/크기/날짜), 삭제 |
| `/estimates/[id]` | PDF 뷰어: signed URL → iframe, 에러 시 "다시 로드" 버튼 |

## 주요 파일

| 파일 | 설명 |
|------|------|
| `src/lib/db/schema.ts` | estimates 테이블 스키마 |
| `src/lib/services/estimates.ts` | 비즈니스 로직 (CRUD + Storage + 검증) |
| `src/app/api/estimates/` | API 라우트 핸들러 |
| `src/hooks/queries/useEstimates.ts` | React Query 훅 |
| `src/app/(main)/estimates/page.tsx` | 목록 페이지 |
| `src/app/(main)/estimates/[id]/page.tsx` | PDF 뷰어 페이지 |
