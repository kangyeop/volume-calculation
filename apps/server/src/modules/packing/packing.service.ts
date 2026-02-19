import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PackingResultEntity } from './entities/packing-result.entity';
import { OutboundService } from '../outbound/outbound.service';
import { ProductsService } from '../products/products.service';
import { BoxesService } from '../boxes/boxes.service';
import { calculatePacking } from './packing.algorithm';
import { SKU, PackingRecommendation, PackingGroupingOption } from '@wms/types';
import { OutboundEntity } from '../outbound/entities/outbound.entity';

@Injectable()
export class PackingService {
  private readonly logger = new Logger(PackingService.name);

  constructor(
    @InjectRepository(PackingResultEntity)
    private readonly packingResultRepository: Repository<PackingResultEntity>,
    private readonly outboundService: OutboundService,
    private readonly productsService: ProductsService,
    private readonly boxesService: BoxesService,
  ) {}

  async calculate(
    projectId: string,
    groupingOption: PackingGroupingOption,
    batchId?: string,
  ): Promise<PackingRecommendation> {
    this.logger.log(
      `Calculating packing for project: ${projectId} with grouping: ${groupingOption}, batch: ${batchId}`,
    );

    const outbounds = await this.outboundService.findAll(projectId, batchId);
    const products = await this.productsService.findAll(projectId);
    const boxes = await this.boxesService.findAll();

    if (boxes.length === 0) {
      throw new BadRequestException(
        '등록된 박스가 없습니다. 박스 관리 메뉴에서 박스를 먼저 등록해주세요.',
      );
    }

    const productMap = new Map(products.map((p) => [p.sku, p]));

    // Group outbounds based on the selected option
    const groupedOutbounds = this.groupOutbounds(outbounds, groupingOption);

    const groups: PackingRecommendation['groups'] = [];
    let grandTotalCBM = 0;
    let grandTotalUsedVolume = 0;
    let grandTotalAvailableVolume = 0;

    for (const group of groupedOutbounds) {
      if (group.length === 0) continue;

      const skus: SKU[] = group
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

      if (skus.length === 0) continue;

      const recommendation = calculatePacking(skus, boxes);
      const groupLabel = this.generateGroupLabel(group[0], groupingOption);

      let groupUsedVolume = 0;
      let groupAvailableVolume = 0;

      for (const rb of recommendation.boxes) {
        const boxVol = rb.box.width * rb.box.length * rb.box.height;
        groupAvailableVolume += boxVol * rb.count;
        for (const packedSku of rb.packedSKUs) {
          const product = products.find((prod) => prod.id === packedSku.skuId);
          if (product) {
            groupUsedVolume += product.width * product.length * product.height * packedSku.quantity;
          }
        }
      }

      // Map product names to packedSKUs
      const boxesWithNames = recommendation.boxes.map((box) => ({
        ...box,
        packedSKUs: box.packedSKUs.map((sku) => {
          const product = products.find((p) => p.id === sku.skuId);
          return {
            ...sku,
            name: product ? product.name : 'Unknown Product',
          };
        }),
      }));

      // Map product names to unpackedItems
      const unpackedWithNames = recommendation.unpackedItems.map((item) => {
        const product = products.find((p) => p.id === item.skuId);
        return {
          ...item,
          name: product ? product.name : 'Unknown Product',
        };
      });

      groups.push({
        groupLabel,
        boxes: boxesWithNames,
        unpackedItems: unpackedWithNames,
        totalCBM: recommendation.totalCBM,
        totalEfficiency: groupAvailableVolume > 0 ? groupUsedVolume / groupAvailableVolume : 0,
      });

      grandTotalCBM += recommendation.totalCBM;
      grandTotalUsedVolume += groupUsedVolume;
      grandTotalAvailableVolume += groupAvailableVolume;
    }

    // Save results to history
    await this.packingResultRepository.delete({ projectId });

    const allRecommendedBoxes = groups.flatMap((g) =>
      g.boxes.map((b) => ({ ...b, groupLabel: g.groupLabel })),
    );

    const results = allRecommendedBoxes.map((rb) =>
      this.packingResultRepository.create({
        projectId,
        boxId: rb.box.id,
        boxName: rb.box.name,
        packedCount: rb.packedSKUs.reduce((acc, s) => acc + s.quantity, 0),
        remainingQuantity: 0, // We could store unpacked count here but for now it's fine
        efficiency: 0,
        totalCBM: (rb.box.width * rb.box.length * rb.box.height * rb.count) / 1000000,
        groupLabel: rb.groupLabel,
      }),
    );

    await this.packingResultRepository.save(results);

    // Calculate total unpacked items across all groups if needed, or just let the frontend handle group-level unpacked
    const allUnpackedItems = groups.flatMap((g) => g.unpackedItems || []);

    return {
      groups,
      totalCBM: grandTotalCBM,
      totalEfficiency:
        grandTotalAvailableVolume > 0 ? grandTotalUsedVolume / grandTotalAvailableVolume : 0,
      unpackedItems: allUnpackedItems, // Optional: expose at top level if needed
    };
  }

  private groupOutbounds(
    outbounds: OutboundEntity[],
    option: PackingGroupingOption,
  ): OutboundEntity[][] {
    const groups = new Map<string, OutboundEntity[]>();

    for (const outbound of outbounds) {
      let key = '';
      switch (option) {
        case PackingGroupingOption.ORDER:
          key = outbound.orderId;
          break;
        case PackingGroupingOption.RECIPIENT:
          key = `${outbound.recipientName || ''}_${outbound.address || ''}`;
          break;
        case PackingGroupingOption.ORDER_RECIPIENT:
          key = `${outbound.orderId}_${outbound.recipientName || ''}_${outbound.address || ''}`;
          break;
        default:
          key = 'default';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(outbound);
    }

    return Array.from(groups.values());
  }

  private generateGroupLabel(outbound: OutboundEntity, option: PackingGroupingOption): string {
    switch (option) {
      case PackingGroupingOption.ORDER:
        return `Order: ${outbound.orderId}`;
      case PackingGroupingOption.RECIPIENT:
        return `Recipient: ${outbound.recipientName || 'Unknown'} (${
          outbound.address || 'No Address'
        })`;
      case PackingGroupingOption.ORDER_RECIPIENT:
        return `Order: ${outbound.orderId} - ${outbound.recipientName || 'Unknown'}`;
      default:
        return 'Default Group';
    }
  }

  async findAll(projectId: string): Promise<PackingResultEntity[]> {
    return this.packingResultRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }
}
