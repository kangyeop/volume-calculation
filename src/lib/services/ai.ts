import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { OutboundMappingSchema, OutboundMappingResult } from '@/lib/schemas/outbound-mapping';
import { ProductMappingSchema, ProductMappingResult } from '@/lib/schemas/product-mapping';
import { SingleProductMatchSchema } from '@/lib/schemas/product-match';
import { buildOutboundPrompt } from '@/lib/prompts/outbound';
import { buildProductPrompt } from '@/lib/prompts/product';
import { buildMatchingPrompt } from '@/lib/prompts/matching';

const openai = new OpenAI();

interface CachedProduct {
  id: string;
  sku: string;
  name: string;
}

interface OutboundItem {
  availableFields: Record<string, string>;
}

export async function mapOutboundColumns(
  headers: string[],
  sampleRows: Record<string, unknown>[],
): Promise<OutboundMappingResult> {
  const prompt = buildOutboundPrompt(headers, sampleRows);
  const response = await openai.responses.parse({
    model: 'gpt-4.1-nano',
    input: [
      {
        role: 'system',
        content: 'You are a helpful data mapping assistant. Analyze CSV headers and sample data to map columns to required fields.',
      },
      { role: 'user', content: prompt },
    ],
    text: { format: zodTextFormat(OutboundMappingSchema, 'outbound_mapping') },
  });
  return response.output_parsed!;
}

export async function mapProductColumns(
  headers: string[],
  sampleRows: Record<string, unknown>[],
): Promise<ProductMappingResult> {
  const prompt = buildProductPrompt(headers, sampleRows);
  const response = await openai.responses.parse({
    model: 'gpt-4.1-nano',
    input: [
      {
        role: 'system',
        content: 'You are a helpful data mapping assistant. Analyze CSV/Excel headers and sample data to map columns to product fields.',
      },
      { role: 'user', content: prompt },
    ],
    text: { format: zodTextFormat(ProductMappingSchema, 'product_mapping') },
  });
  return response.output_parsed!;
}

export async function mapOutboundItemsToProducts(
  outboundItems: OutboundItem[],
): Promise<Array<{ outboundItemIndex: number; productIds?: string[] }>> {
  const allProducts = await db
    .select({ id: products.id, sku: products.sku, name: products.name })
    .from(products);

  const cachedProducts: CachedProduct[] = allProducts;

  const results = await Promise.all(
    outboundItems.map((item, index) => findMatchesWithAI(item, cachedProducts, index)),
  );

  return results;
}

async function findMatchesWithAI(
  item: OutboundItem,
  cachedProducts: CachedProduct[],
  index: number,
): Promise<{ outboundItemIndex: number; productIds?: string[] }> {
  if (cachedProducts.length === 0) {
    return { outboundItemIndex: index };
  }

  try {
    const prompt = buildMatchingPrompt(item, cachedProducts);
    const response = await openai.responses.parse({
      model: 'gpt-4.1-nano',
      input: [
        {
          role: 'system',
          content: 'You are a product matching assistant. Find the best matching product for an outbound order item.',
        },
        { role: 'user', content: prompt },
      ],
      text: { format: zodTextFormat(SingleProductMatchSchema, 'product_match') },
    });

    const result = response.output_parsed;
    if (!result || result.matchedIndexes.length === 0) {
      return { outboundItemIndex: index };
    }

    const productIds = result.matchedIndexes
      .map((i: number) => cachedProducts[i]?.id)
      .filter((id: string | undefined): id is string => !!id);

    return { outboundItemIndex: index, productIds };
  } catch {
    return { outboundItemIndex: index };
  }
}
