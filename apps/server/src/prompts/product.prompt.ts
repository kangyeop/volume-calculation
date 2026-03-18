export function buildProductPrompt(headers: string[], sampleRows: any[]): string {
  const fullData = sampleRows.map((row) =>
    Object.fromEntries(headers.map((h) => [h, row[h] ?? ''])),
  );

  return `Analyze following Excel data and map columns to product fields.

Headers: ${headers.join(', ')}

Complete Data (JSON format, ${sampleRows.length} rows):
${JSON.stringify(fullData, null, 2)}

Required fields to map:
- sku: identifier / code / index
  Pattern: Alphanumeric code, product code, 상품코드, SKU, 순번

- name: Product name / display name
  Pattern: 상품명, product name, item name

- dimensions: Combined dimension string (if dimensions are in a single column)
  Pattern: "10x20x30", "10*20*30", "100x200x150cm"
  Only map this if dimensions are combined in one column.

Mapping Rules:
1. Prefer columns with exact Korean field names (상품코드, 상품명, 가로, 세로, 높이)
2. Look at actual data values to determine the best mapping
3. Set dimensionFormat to 'combined' if dimensions are in a single column like "10x20x30"
4. Set dimensionFormat to 'separate' if width/length/height are in separate columns
5. If dimensions are combined, set width/height/length to null
6. If dimensions are separate, set dimensions to null
7. Ignore system/internal fields`;
}
