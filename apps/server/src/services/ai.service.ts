import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsRepository } from '../repositories/products.repository';
import { OutboundMappingSchema, OutboundMappingResult } from './schemas/outbound-mapping.schema';
import { SingleProductMatchSchema } from './schemas/product-match.schema';
import { ChatOpenAI } from '@langchain/openai';

interface CachedProduct {
  id: string;
  sku: string;
  name: string;
  searchKey: string;
}

interface ProductCache {
  projectId: string;
  products: CachedProduct[];
  lastUpdated: Date;
}

interface OutboundItem {
  availableFields: Record<string, string>;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly cache = new Map<string, ProductCache>();
  private readonly cacheTTL: number;

  constructor(
    @Inject('LLM_PROVIDER') private readonly apiKey: string,
    private readonly productsRepository: ProductsRepository,
    private readonly configService: ConfigService,
  ) {
    this.cacheTTL = this.configService.get('PRODUCT_CACHE_TTL', 3600000);
  }

  async mapOutboundColumns(headers: string[], sampleRows: any[]): Promise<OutboundMappingResult> {
    try {
      this.logger.log(`Mapping outbound columns for ${headers.length} headers`);

      const llm = this.createLLM();
      const structuredLlm = llm.withStructuredOutput(OutboundMappingSchema);
      const prompt = this.buildOutboundPrompt(headers, sampleRows);

      const result = await structuredLlm.invoke([
        [
          'system',
          'You are a helpful data mapping assistant. Analyze CSV headers and sample data to map columns to required fields.',
        ],
        ['human', prompt],
      ]);

      this.logger.log(`Successfully mapped outbound columns`);

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to map outbound columns using AI: ${err.message}`, err.stack);
      throw error;
    }
  }

  async mapOutboundItemsToProducts(
    projectId: string,
    outboundItems: OutboundItem[],
  ): Promise<Array<{ outboundItemIndex: number; productIds?: string[] }>> {
    this.logger.log(`Mapping ${outboundItems.length} outbound items for project ${projectId}`);

    const products = await this.getProductCache(projectId);

    const results = await Promise.all(
      outboundItems.map(async (item, index) => this.findMatchesWithAI(item, products, index)),
    );

    this.logger.log(`Mapping complete`);

    return results;
  }

  private createLLM(): ChatOpenAI {
    return new ChatOpenAI({
      modelName: 'gpt-4.1-nano',
      temperature: 0,
      apiKey: this.apiKey,
    });
  }

  private async getProductCache(projectId: string): Promise<CachedProduct[]> {
    const cached = this.cache.get(projectId);
    const now = new Date();

    if (cached && now.getTime() - cached.lastUpdated.getTime() < this.cacheTTL) {
      this.logger.log(`Using cached products for project ${projectId}`);
      return cached.products;
    }

    this.logger.log(`Loading products for project ${projectId}`);
    const products = await this.productsRepository.findWithSelect(projectId, ['id', 'sku', 'name']);

    const cachedProducts: CachedProduct[] = products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      searchKey: `${p.sku.toLowerCase()} ${p.name.toLowerCase()}`,
    }));

    this.cache.set(projectId, {
      projectId,
      products: cachedProducts,
      lastUpdated: now,
    });

    this.logger.log(`Cached ${cachedProducts.length} products for project ${projectId}`);
    return cachedProducts;
  }

  private async findMatchesWithAI(
    item: OutboundItem,
    products: CachedProduct[],
    index: number,
  ): Promise<{ outboundItemIndex: number; productIds?: string[] }> {
    if (products.length === 0) {
      return {
        outboundItemIndex: index,
      };
    }

    try {
      const llm = this.createLLM();
      const structuredLlm = llm.withStructuredOutput(SingleProductMatchSchema);
      const prompt = this.buildMatchingPrompt(item, products);

      const result = await structuredLlm.invoke([
        [
          'system',
          'You are a product matching assistant. Find the best matching product for an outbound order item.',
        ],
        ['human', prompt],
      ]);

      if (result.matchedIndexes.length === 0) {
        return {
          outboundItemIndex: index,
        };
      }

      const productIds = result.matchedIndexes
        .map((i) => products[i]?.id)
        .filter((id): id is string => !!id);

      return {
        outboundItemIndex: index,
        productIds,
      } as { outboundItemIndex: number; productIds: string[] };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`AI matching failed: ${err.message}`, err.stack);

      return {
        outboundItemIndex: index,
      };
    }
  }

  private buildOutboundPrompt(headers: string[], sampleRows: any[]): string {
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

- orderQty: order quantity (multiplier for item quantity)
  Pattern: Number
  Example: if orderQty=2 and quantity=5, final quantity=10

- sku: sku name
  Pattern: (상품명 / 개수ea)

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

  private buildMatchingPrompt(item: OutboundItem, products: CachedProduct[]): string {
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

  invalidateCache(projectId: string): void {
    this.cache.delete(projectId);
    this.logger.log(`Invalidated cache for project ${projectId}`);
  }
}
