# 나나시.xlsx E2E 테스트 가이드

## 테스트 구조

```
apps/web/e2e/
├── fixtures/
│   ├── nanasi-excel.json        - 테스트 데이터 정의
│   └── nanasi-excel.fixture.ts   - 실제 엑셀 내용물
├── tests/
│   ├── upload.spec.ts          - 업로드 기능 테스트
│   ├── packing.spec.ts         - 박스 계산 테스트
│   └── results.spec.ts          - 결과 표시 테스트
├── playwright.config.ts         - Playwright 설정
└── package.json              - 의존성 관리
```

## 테스트 실행 방법

```bash
# 1단계: 의존성 설치
pnpm add -D @playwright/test

# 2단계: 백엔드 서버 시작
cd /Users/yeop/dev/wms && pnpm dev:server

# 3단계: 테스트 실행 (웹 앱 대상)
cd apps/web && npx playwright test
```

## 테스트 파일 설명

### upload.spec.ts

- Excel 파일 선택 및 업로드
- API 응답 확인 (success, headers, rowCount)
- 파싱 결과 확인

### packing.spec.ts

- 박스 계산 API 호출
- 결과 검증 (totalEfficiency, totalCBM)
- 풀 세트/단일 주문 박스 수량 확인

### results.spec.ts

- 웹 페이지 로드 후 UI 요소 확인
- 주문 요약 표시 (33개 주문)
- 박스 계산 결과 표시
- 전체 효율성 정보 확인

## 다음 단계

1. 백엔드 서버에 Project 및 Box 데이터 설정
2. 웹 앱에서 업로드/파싱/결과 페이지 접근 확인
3. 테스트 실행하여 시스템 전체 기능 검증

---

이 가이드에 따라 E2E 테스트를 수정하여 나나시.xlsx 업로드부터 결과 확인까지의 전체 과정을 검증할 수 있습니다.
