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
- itemPattern: 개별 항목에서 상품명과 수량을 추출하는 JavaScript 정규식.
  캡처 그룹 규칙: group(1)=상품명, group(2)=수량(있을 경우).
  데이터에 실제로 나타나는 패턴을 정확히 분석해서 정규식을 만들어라.
  어떤 형태든 상관없다. 괄호, 슬래시, 대괄호, 수량 단위(ea, 개, pcs 등) 등 모든 패턴을 자유롭게 처리하라.
- parsedSamples: 실제 데이터에서 복합 상품 셀을 delimiter로 분리한 뒤, 각 항목을 itemPattern으로 파싱한 결과.
  최소 3개 이상의 항목을 파싱하라.
  각 항목은 { raw: "원본 텍스트", productName: "추출된 상품명", quantity: 수량(숫자) } 형태.
  수량 표기가 없으면 quantity는 1로 처리.`;
}

export function buildCompoundRetryPrompt(
  headers: string[],
  sampleRows: any[],
  previousPattern: string,
  failures: { raw: string; expected: { productName: string; quantity: number } }[],
): string {
  const basePrompt = buildCompoundDetectionPrompt(headers, sampleRows);

  const failureDetails = failures
    .map((f) => `  - "${f.raw}" → 기대: {productName: "${f.expected.productName}", quantity: ${f.expected.quantity}}`)
    .join('\n');

  return `${basePrompt}

이전에 생성한 정규식이 실패했다:
이전 정규식: ${previousPattern}
실패한 항목:
${failureDetails}

위 항목들이 정확히 파싱되도록 정규식을 수정하라.`;
}
