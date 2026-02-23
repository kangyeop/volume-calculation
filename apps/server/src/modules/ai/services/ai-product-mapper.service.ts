import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ProductEntity } from '../../products/entities/product.entity';
import { SingleProductMatchSchema } from '../schemas/product-match.schema';

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
export class AIProductMapperService {
  private readonly logger = new Logger(AIProductMapperService.name);
  private readonly cache = new Map<string, ProductCache>();
  private readonly cacheTTL: number;
  private readonly autoAcceptThreshold: number;

  constructor(
    @Inject('LLM_PROVIDER') private readonly llm: BaseChatModel,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    private readonly configService: ConfigService,
  ) {
    this.cacheTTL = this.configService.get('PRODUCT_CACHE_TTL', 3600000);
    this.autoAcceptThreshold = this.configService.get('PRODUCT_MAPPING_AUTO_ACCEPT_THRESHOLD', 0.9);
  }

  async mapOutboundItemsToProducts(
    projectId: string,
    outboundItems: OutboundItem[],
  ): Promise<{
    results: Array<{
      outboundItemIndex: number;
      outboundSku: string;
      outboundName?: string;
      matchedProduct?: { id: string; sku: string; name: string };
      confidence: number;
      matchReason: string;
      needsReview: boolean;
      alternativeMatches?: Array<{ id: string; sku: string; name: string; confidence: number }>;
    }>;
    totalItems: number;
    matchedItems: number;
    unmatchedItems: number;
    needsReview: number;
  }> {
    this.logger.log(`Mapping ${outboundItems.length} outbound items for project ${projectId}`);

    const products = await this.getProductCache(projectId);
    const results = await Promise.all(
      outboundItems.map(async (item, index) => {
        const exactMatch = this.findExactMatch(item.availableFields, products);
        if (exactMatch) {
          this.logger.log(`Exact SKU match found`);
          return {
            outboundItemIndex: index,
            outboundSku: exactMatch.sku,
            outboundName: exactMatch.name,
            matchedProduct: {
              id: exactMatch.id,
              sku: exactMatch.sku,
              name: exactMatch.name,
            },
            confidence: 1.0,
            matchReason: 'Exact SKU match',
            needsReview: false,
          };
        }

        return this.findBestMatchWithAI(item, products, index);
      }),
    );

    const totalItems = results.length;
    const matchedItems = results.filter((r) => r.matchedProduct !== undefined).length;
    const unmatchedItems = totalItems - matchedItems;
    const needsReview = results.filter((r) => r.needsReview).length;

    this.logger.log(
      `Mapping complete: ${matchedItems} matched, ${unmatchedItems} unmatched, ${needsReview} needs review`,
    );

    return {
      results,
      totalItems,
      matchedItems,
      unmatchedItems,
      needsReview,
    };
  }

  private async getProductCache(projectId: string): Promise<CachedProduct[]> {
    const cached = this.cache.get(projectId);
    const now = new Date();

    if (cached && now.getTime() - cached.lastUpdated.getTime() < this.cacheTTL) {
      this.logger.log(`Using cached products for project ${projectId}`);
      return cached.products;
    }

    this.logger.log(`Loading products for project ${projectId}`);
    const products = await this.productsRepository.find({
      where: { projectId },
      select: ['id', 'sku', 'name'],
    });

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

  private findExactMatch(
    availableFields: Record<string, string>,
    products: CachedProduct[],
  ): CachedProduct | null {
    for (const [, value] of Object.entries(availableFields)) {
      if (!value) continue;

      const normalizedInput = value.toLowerCase().trim();
      const matched = products.find((p) => p.sku.toLowerCase() === normalizedInput);
      if (matched) {
        return matched;
      }
    }

    return null;
  }

  private async findBestMatchWithAI(
    item: OutboundItem,
    products: CachedProduct[],
    index: number,
  ): Promise<{
    outboundItemIndex: number;
    outboundSku: string;
    outboundName?: string;
    matchedProduct?: { id: string; sku: string; name: string };
    confidence: number;
    matchReason: string;
    needsReview: boolean;
    alternativeMatches?: Array<{ id: string; sku: string; name: string; confidence: number }>;
  }> {
    if (products.length === 0) {
      return {
        outboundItemIndex: index,
        outboundSku: item.availableFields.sku || '',
        outboundName: item.availableFields.name || '',
        matchedProduct: undefined,
        confidence: 0,
        matchReason: 'No products available in project',
        needsReview: true,
      };
    }

    try {
      const structuredLlm = this.llm.withStructuredOutput(SingleProductMatchSchema);
      const prompt = this.buildMatchingPrompt(item, products);

      const result = (await structuredLlm.invoke([
        [
          'system',
          'You are a product matching assistant. Find the best matching product for an outbound order item.',
        ],
        ['human', prompt],
      ])) as { matchedIndex: number; confidence: number; reason: string; needsReview: boolean };

      if (result.matchedIndex === -1 || result.confidence < 0.3) {
        return {
          outboundItemIndex: index,
          outboundSku: item.availableFields.sku || '',
          outboundName: item.availableFields.name || '',
          matchedProduct: undefined,
          confidence: result.confidence,
          matchReason: result.reason || 'No suitable match found',
          needsReview: true,
        };
      }

      const matchedProduct = products[result.matchedIndex];
      const needsReview = result.confidence < this.autoAcceptThreshold;

      return {
        outboundItemIndex: index,
        outboundSku: item.availableFields.sku || '',
        outboundName: item.availableFields.name || '',
        matchedProduct: {
          id: matchedProduct.id,
          sku: matchedProduct.sku,
          name: matchedProduct.name,
        },
        confidence: result.confidence,
        matchReason: result.reason || 'AI-based semantic match',
        needsReview,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`AI matching failed: ${err.message}`, err.stack);

      return {
        outboundItemIndex: index,
        outboundSku: item.availableFields.sku || '',
        outboundName: item.availableFields.name || '',
        matchedProduct: undefined,
        confidence: 0,
        matchReason: 'AI matching failed',
        needsReview: true,
      };
    }
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
1. Analyze all available fields from the outbound item
2. Identify which field(s) contain product name or product code
3. Look for semantic similarity with product names in the database
4. Consider common patterns: product names in quotes, variant info, codes
5. Return matchedIndex of best matching product, or -1 if no match

Thresholds:
- confidence >= 0.9: Auto-accept (exact match)
- 0.7 <= confidence < 0.9: Accept but flag for review
- confidence < 0.7: Needs manual review`;
  }

  invalidateCache(projectId: string): void {
    this.cache.delete(projectId);
    this.logger.log(`Invalidated cache for project ${projectId}`);
  }
}
