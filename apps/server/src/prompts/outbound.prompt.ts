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

- sku: single product name per row
  IMPORTANT: Choose the column where each cell contains the SHORTEST, cleanest single product name.
  AVOID columns that contain multiple product names joined by "+" or combined with category/set prefixes like "세트 - A + B + C".
  If two columns both contain product names, always pick the one with shorter, simpler values.

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
