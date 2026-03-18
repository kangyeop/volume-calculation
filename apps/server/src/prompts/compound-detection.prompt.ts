export function buildCompoundDetectionPrompt(headers: string[], sampleRows: any[]): string {
  const fullData = sampleRows.map((row) =>
    Object.fromEntries(headers.map((h) => [h, row[h] ?? ''])),
  );

  return `아래 엑셀 데이터의 상품/SKU 관련 컬럼 값들을 분석하라.

Headers: ${headers.join(', ')}

Sample Data (JSON format, ${sampleRows.length} rows):
${JSON.stringify(fullData, null, 2)}

판단 기준:
- 셀 하나에 여러 상품이 구분자(쉼표, 슬래시, 줄바꿈 등)로 나열되어 있는가?
- "세트상품 A+B", "A+B 세트" 등의 "+"는 상품명의 일부이지 구분자가 아니다.
- 모든 셀이 단일 상품이면 detected=false, 나머지 필드는 null.

detected=true인 경우:
- delimiter: 상품 간 구분자 (e.g., ",", "/", "\\n")
- itemPattern: 개별 상품+수량을 추출하는 정규식.
  캡처 그룹 규칙: group(1)=상품명, group(2)=수량(있을 경우).
  예시: "상품A[2]" → "(.+?)\\\\[([0-9]+)\\\\]"
        "상품A(2개)" → "(.+?)\\\\(([0-9]+)개\\\\)"
        "상품A x2" → "(.+?)\\\\s*[xX]\\\\s*([0-9]+)"
        수량 표기 없이 상품명만 → "(.+)"`;
}
