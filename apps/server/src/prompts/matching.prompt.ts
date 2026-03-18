interface MatchingItem {
  availableFields: Record<string, string>;
}

interface MatchingProduct {
  sku: string;
  name: string;
}

export function buildMatchingPrompt(
  item: MatchingItem,
  products: MatchingProduct[],
): string {
  const fieldsList = Object.entries(item.availableFields)
    .filter(([_, value]) => value)
    .map(([field, value]) => `- ${field}: "${value}"`)
    .join('\n');

  const productCount = Math.min(products.length, 50);
  const topProducts = products.slice(0, productCount);
  const productList = topProducts
    .map((p, i) => `${i + 1}. SKU: "${p.sku}", Name: "${p.name}"`)
    .join('\n');

  return `
Outbound Item Fields:
${fieldsList || 'No fields available'}

Available Products (${productCount} of ${products.length}):
${productList}

AI Instructions:
1. Analyze all available fields from outbound item
2. Identify which field(s) contain product name or product code
3. Look for semantic similarity with product names in database
4. Consider common patterns: product names in quotes, variant info, codes
5. Return matchedIndexes of all matching products, or an empty array if no match found`;
}
