import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../../products/entities/product.entity';
import { SingleProductMatchSchema } from '../schemas/product-match.schema';
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
export class AIProductMapperService {
  private readonly logger = new Logger(AIProductMapperService.name);
  private readonly cache = new Map<string, ProductCache>();
  private readonly cacheTTL: number;

  constructor(
    @Inject('LLM_PROVIDER') private readonly apiKey: string,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    private readonly configService: ConfigService,
  ) {
    this.cacheTTL = this.configService.get('PRODUCT_CACHE_TTL', 3600000);
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
      const llm = new ChatOpenAI({
        modelName: 'gpt-4.1-nano',
        temperature: 0,
        apiKey: this.apiKey,
      });
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
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`AI matching failed: ${err.message}`, err.stack);

      return {
        outboundItemIndex: index,
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
5. Return matchedIndexes of all matching products, or an empty array if no match found`;
  }

  invalidateCache(projectId: string): void {
    this.cache.delete(projectId);
    this.logger.log(`Invalidated cache for project ${projectId}`);
  }
}
