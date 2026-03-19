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
import {
  buildCompoundDetectionPrompt,
  buildCompoundRetryPrompt,
} from '../prompts/compound-detection.prompt';

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
    const MAX_RETRIES = 2;

    try {
      this.logger.log('Detecting compound products in sample data');

      const llm = createLLM({ apiKey: this.apiKey }).withStructuredOutput(CompoundDetectionSchema);
      const systemMessage =
        'You are a data analysis assistant. Analyze Excel data to detect compound product patterns in cells.';

      let prompt = buildCompoundDetectionPrompt(headers, sampleRows);
      let result = await llm.invoke([['system', systemMessage], ['human', prompt]]);

      this.logger.log(`Compound detection result: detected=${result.detected}`);

      if (!result.detected || !result.itemPattern || !result.parsedSamples?.length) {
        return result;
      }

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const failures = this.validatePattern(result.itemPattern, result.parsedSamples);

        if (failures.length === 0) {
          this.logger.log('Compound pattern validated successfully');
          return result;
        }

        this.logger.warn(
          `Pattern validation failed (attempt ${attempt + 1}/${MAX_RETRIES}): ${failures.length} mismatches, pattern: ${result.itemPattern}`,
        );

        prompt = buildCompoundRetryPrompt(headers, sampleRows, result.itemPattern, failures);
        result = await llm.invoke([['system', systemMessage], ['human', prompt]]);

        if (!result.detected || !result.itemPattern || !result.parsedSamples?.length) {
          return result;
        }
      }

      const finalFailures = this.validatePattern(result.itemPattern, result.parsedSamples);
      if (finalFailures.length > 0) {
        this.logger.warn(
          `Pattern validation still failing after retries, pattern: ${result.itemPattern}, failures: ${JSON.stringify(finalFailures.map((f) => f.raw))}`,
        );
      }

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to detect compound products: ${err.message}`, err.stack);
      return { detected: false, delimiter: null, itemPattern: null, parsedSamples: null };
    }
  }

  private validatePattern(
    pattern: string,
    samples: { raw: string; productName: string; quantity: number }[],
  ): { raw: string; expected: { productName: string; quantity: number } }[] {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern);
    } catch {
      return samples.map((s) => ({ raw: s.raw, expected: { productName: s.productName, quantity: s.quantity } }));
    }

    const failures: { raw: string; expected: { productName: string; quantity: number } }[] = [];

    for (const sample of samples) {
      const match = sample.raw.match(regex);
      if (!match) {
        failures.push({ raw: sample.raw, expected: { productName: sample.productName, quantity: sample.quantity } });
        continue;
      }

      const groups = match.slice(1).filter((g) => g !== undefined);
      const nameCandidate = (groups[0] ?? '').trim();
      const qtyCandidate = groups.length > 1 ? parseInt(groups[1], 10) : 1;
      const extractedName = nameCandidate;
      const extractedQty = isNaN(qtyCandidate) ? 1 : qtyCandidate;

      if (extractedName !== sample.productName.trim() || extractedQty !== sample.quantity) {
        failures.push({ raw: sample.raw, expected: { productName: sample.productName, quantity: sample.quantity } });
      }
    }

    return failures;
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
