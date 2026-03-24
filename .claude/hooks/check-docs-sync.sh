#!/bin/bash
FILE="$1"

case "$FILE" in
  */lib/db/schema.ts)
    echo '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"DB 스키마 변경 감지. docs/db-schema.md + 관련 docs/domain/ 문서의 데이터 모델 섹션 업데이트 필수."}}'
    ;;
  */app/api/*)
    echo '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"API 라우트 변경 감지. 관련 docs/domain/ 문서의 API 섹션 업데이트 필수."}}'
    ;;
  */lib/services/*)
    echo '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"서비스 변경 감지. 관련 docs/domain/ 문서 + docs/architecture.md 디렉토리 구조 확인 필수."}}'
    ;;
  */app/\(main\)/*)
    echo '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"페이지 변경 감지. docs/architecture.md 프론트엔드 라우트 + 관련 docs/domain/ 문서 페이지 섹션 확인 필수."}}'
    ;;
  */hooks/*)
    echo '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"훅 변경 감지. docs/architecture.md 디렉토리 구조 + 관련 docs/domain/ 문서 주요 파일 확인 필수."}}'
    ;;
  */components/*)
    echo '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"컴포넌트 변경 감지. docs/architecture.md 디렉토리 구조 확인 필수."}}'
    ;;
esac
