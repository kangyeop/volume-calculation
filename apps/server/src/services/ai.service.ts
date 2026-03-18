import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsRepository } from '../repositories/products.repository';
import { OutboundMappingSchema, OutboundMappingResult } from './schemas/outbound-mapping.schema';
import { ProductMappingSchema, ProductMappingResult } from './schemas/product-mapping.schema';
import { SingleProductMatchSchema } from './schemas/product-match.schema';
import {
  CompoundDetectionSchema,
  CompoundDetectionResult,
} from './schemas/compound-detection.schema';
import { createLLM } from '../utils/langchain';
import { buildOutboundPrompt } from '../prompts/outbound.prompt';
import { buildProductPrompt } from '../prompts/product.prompt';
import { buildMatchingPrompt } from '../prompts/matching.prompt';
import { buildCompoundDetectionPrompt } from '../prompts/compound-detection.prompt';

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

      const llm = createLLM({ apiKey: this.apiKey }).withStructuredOutput(OutboundMappingSchema);
      const prompt = buildOutboundPrompt(headers, sampleRows);

      const result = await llm.invoke([
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

  async detectCompoundProducts(
    headers: string[],
    sampleRows: any[],
  ): Promise<CompoundDetectionResult> {
    try {
      this.logger.log('Detecting compound products in sample data');

      const llm = createLLM({ apiKey: this.apiKey }).withStructuredOutput(CompoundDetectionSchema);
      const prompt = buildCompoundDetectionPrompt(headers, sampleRows);

      const result = await llm.invoke([
        [
          'system',
          'You are a data analysis assistant. Analyze Excel data to detect compound product patterns in cells.',
        ],
        ['human', prompt],
      ]);

      this.logger.log(`Compound detection result: detected=${result.detected}`);

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to detect compound products: ${err.message}`, err.stack);
      return { detected: false, delimiter: null, itemPattern: null };
    }
  }

  async mapProductColumns(headers: string[], sampleRows: any[]): Promise<ProductMappingResult> {
    try {
      this.logger.log(`Mapping product columns for ${headers.length} headers`);

      const llm = createLLM({ apiKey: this.apiKey }).withStructuredOutput(ProductMappingSchema);
      const prompt = buildProductPrompt(headers, sampleRows);

      const result = await llm.invoke([
        [
          'system',
          'You are a helpful data mapping assistant. Analyze CSV/Excel headers and sample data to map columns to product fields.',
        ],
        ['human', prompt],
      ]);

      this.logger.log(`Successfully mapped product columns (format: ${result.dimensionFormat})`);

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to map product columns using AI: ${err.message}`, err.stack);
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
      const llm = createLLM({ apiKey: this.apiKey }).withStructuredOutput(SingleProductMatchSchema);
      const prompt = buildMatchingPrompt(item, products);

      const result = await llm.invoke([
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

  invalidateCache(projectId: string): void {
    this.cache.delete(projectId);
    this.logger.log(`Invalidated cache for project ${projectId}`);
  }
}
