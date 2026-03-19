export function buildOutboundPrompt(headers: string[], sampleRows: any[]): string {
  const fullData = sampleRows.map((row) =>
    Object.fromEntries(headers.map((h) => [h, row[h] ?? ''])),
  );

  return `Analyze following Excel data and map columns to outbound order fields.

Headers: ${headers.join(', ')}

Complete Data (JSON format, ${sampleRows.length} rows):
${JSON.stringify(fullData, null, 2)}

Required fields to map:
- orderId: for tracking order
  Pattern: Long numeric string

- sku: product name column
  IMPORTANT: Choose the column whose values match the pattern "(상품명 / Nea)" — e.g. "(스코_윈터_키링_니노 / 1ea)".
  This column may contain multiple items separated by newlines like "(상품A / 1ea)\\r\\n(상품B / 1ea)".
  Do NOT pick code/ID columns like "(V_01184)" or columns with "+" joined names.

- quantity: item quantity per unit
  Pattern: Number

- recipientName
  Pattern: Person's name

- address
  Pattern: Main address

Mapping Rules:
1. Prefer columns with exact Korean field names
2. Look for common patterns in actual data values
3. Ignore system/internal fields
5. Ignore complex/formatted columns`;
}
