import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PackingResultEntity } from './entities/packing-result.entity';
import { OutboundService } from '../outbound/outbound.service';
import { ProductsService } from '../products/products.service';
import { calculatePacking, STANDARD_BOXES } from './packing.algorithm';
import { SKU, PackingRecommendation } from '@wms/types';

@Injectable()
export class PackingService {
  private readonly logger = new Logger(PackingService.name);

  constructor(
    @InjectRepository(PackingResultEntity)
    private readonly packingResultRepository: Repository<PackingResultEntity>,
    private readonly outboundService: OutboundService,
    private readonly productsService: ProductsService,
  ) {}

  async calculate(projectId: string): Promise<PackingRecommendation> {
    this.logger.log(`Calculating packing for project: ${projectId}`);

    const outbounds = await this.outboundService.findAll(projectId);
    const products = await this.productsService.findAll(projectId);

    const productMap = new Map(products.map((p) => [p.sku, p]));

    const skus: SKU[] = outbounds
      .map((o) => {
        const product = productMap.get(o.sku);
        if (!product) {
          this.logger.warn(`Product not found for SKU: ${o.sku}`);
          return null;
        }
        return {
          id: product.id,
          name: product.name,
          width: product.width,
          length: product.length,
          height: product.height,
          quantity: o.quantity,
        };
      })
      .filter((s): s is SKU => s !== null);

    const recommendation = calculatePacking(skus, STANDARD_BOXES);

    // Save results to history
    await this.packingResultRepository.delete({ projectId });

    const results = recommendation.boxes.map((rb) =>
      this.packingResultRepository.create({
        projectId,
        boxId: rb.box.id,
        boxName: rb.box.name,
        packedCount: rb.packedSKUs.reduce((acc, s) => acc + s.quantity, 0),
        remainingQuantity: 0, // In this simple version, we assume all are packed or skipped
        efficiency: recommendation.totalEfficiency,
        totalCBM: recommendation.totalCBM,
      }),
    );

    await this.packingResultRepository.save(results);

    return recommendation;
  }

  async findAll(projectId: string): Promise<PackingResultEntity[]> {
    return this.packingResultRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }
}
