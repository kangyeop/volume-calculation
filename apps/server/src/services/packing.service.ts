import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PackingResultEntity } from '../entities/packingResult.entity';
import { PackingResultDetailEntity } from '../entities/packingResultDetail.entity';
import { OutboundService } from './outbound.service';
import { ProductsService } from './products.service';
import { BoxesService } from './boxes.service';
import { calculatePacking } from '../modules/packing/algorithms/packing.algorithm';
import { calculateOrderPacking3D } from '../modules/packing/algorithms/packing.3d.algorithm';
import { SKU, PackingRecommendation, PackingGroupingOption, PackingResult3D } from '@wms/types';
import { OutboundEntity } from '../entities/outbound.entity';
import { PackingResultsRepository } from '../repositories/packing-results.repository';
import { PackingResultDetailsRepository } from '../repositories/packing-result-details.repository';

@Injectable()
export class PackingService {
  private readonly logger = new Logger(PackingService.name);

  constructor(
    private readonly packingResultRepository: PackingResultsRepository,
    private readonly packingResultDetailRepository: PackingResultDetailsRepository,
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

    const groupedOutbounds = this.groupOutbounds(outbounds, groupingOption);

    const groups: PackingRecommendation['groups'] = [];
    let grandTotalCBM = 0;
    let grandTotalUsedVolume = 0;
    let grandTotalAvailableVolume = 0;

    const detailResults: PackingResultDetailEntity[] = [];

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

      const boxVolMap = new Map<string, number>();
      for (const rb of recommendation.boxes) {
        const boxVol = rb.box.width * rb.box.length * rb.box.height;
        boxVolMap.set(rb.box.id, boxVol);
        groupAvailableVolume += boxVol * rb.count;
        for (const packedSku of rb.packedSKUs) {
          const product = products.find((prod) => prod.id === packedSku.skuId);
          if (product) {
            groupUsedVolume += product.width * product.length * product.height * packedSku.quantity;
          }
        }
      }

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

      const unpackedWithNames = recommendation.unpackedItems.map((item) => {
        const product = products.find((p) => p.id === item.skuId);
        return {
          ...item,
          name: product ? product.name : 'Unknown Product',
        };
      });

      let boxIndex = 1;
      const skuBoxMap = new Map<string, { boxName: string; boxNumber: number; boxIndex: number }>();

      for (const box of boxesWithNames) {
        for (let i = 0; i < box.count; i++) {
          box.packedSKUs.forEach(() => {
            const key = `${groupLabel}_${boxIndex}`;
            skuBoxMap.set(key, {
              boxName: box.box.name,
              boxNumber: i + 1,
              boxIndex,
            });
          });
          boxIndex++;
        }
      }

      for (const outbound of group) {
        const product = productMap.get(outbound.sku);
        if (!product) continue;

        const key = `${groupLabel}_${skuBoxMap.size}`;
        const boxInfo = skuBoxMap.get(key) || {
          boxName: unpackedWithNames.length > 0 ? 'Unpacked' : 'Unknown',
          boxNumber: 0,
          boxIndex: 0,
        };

        const isUnpacked = unpackedWithNames.some((u) => u.skuId === product.id && u.quantity > 0);

        const unpackedItem = unpackedWithNames.find((u) => u.skuId === product.id);

        const boxCBM = boxInfo.boxIndex > 0 ? (boxVolMap.get(boxInfo.boxName) || 0) / 1000000 : 0;

        const efficiency =
          boxInfo.boxIndex > 0
            ? (product.width * product.length * product.height * outbound.quantity) /
              (boxVolMap.get(boxInfo.boxName) || 1)
            : 0;

        detailResults.push(
          this.packingResultDetailRepository.create({
            projectId,
            batchId: outbound.batchId,
            batchName: outbound.batchName,
            orderId: outbound.orderId,
            recipientName: outbound.recipientName,
            sku: outbound.sku,
            productName: product.name,
            quantity: outbound.quantity,
            boxName: boxInfo.boxName,
            boxNumber: boxInfo.boxNumber,
            boxIndex: boxInfo.boxIndex,
            boxCBM,
            efficiency,
            unpacked: isUnpacked,
            unpackedReason: unpackedItem?.reason || '',
          }),
        );
      }

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

    await this.packingResultRepository.removeAll(projectId);
    await this.packingResultDetailRepository.removeAll(projectId);

    const allRecommendedBoxes = groups.flatMap((g) =>
      g.boxes.map((b) => ({ ...b, groupLabel: g.groupLabel })),
    );

    const results = allRecommendedBoxes.map((rb) => ({
      projectId,
      boxId: rb.box.id,
      boxName: rb.box.name,
      packedCount: rb.packedSKUs.reduce((acc, s) => acc + s.quantity, 0),
      remainingQuantity: 0,
      efficiency: 0,
      totalCBM: (rb.box.width * rb.box.length * rb.box.height * rb.count) / 1000000,
      groupLabel: rb.groupLabel,
    }));

    await this.packingResultRepository.createBulk(results);

    if (detailResults.length > 0) {
      await this.packingResultDetailRepository.createBulk(detailResults);
    }

    const allUnpackedItems = groups.flatMap((g) => g.unpackedItems || []);

    return {
      groups,
      totalCBM: grandTotalCBM,
      totalEfficiency:
        grandTotalAvailableVolume > 0 ? grandTotalUsedVolume / grandTotalAvailableVolume : 0,
      unpackedItems: allUnpackedItems,
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
          key = outbound.recipientName || 'Unknown';
          break;
        case PackingGroupingOption.ORDER_RECIPIENT:
          key = `${outbound.orderId}_${outbound.recipientName || 'Unknown'}`;
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
        return `Recipient: ${outbound.recipientName || 'Unknown'}`;
      case PackingGroupingOption.ORDER_RECIPIENT:
        return `Order: ${outbound.orderId} - ${outbound.recipientName || 'Unknown'}`;
      default:
        return 'Default Group';
    }
  }

  async findAll(projectId: string): Promise<PackingResultEntity[]> {
    return await this.packingResultRepository.findAll(projectId);
  }

  async calculateOrderPacking(
    projectId: string,
    orderId: string,
    groupLabel?: string,
  ): Promise<PackingResult3D> {
    this.logger.log(`Calculating 3D packing for order: ${orderId}`);

    const outbounds = await this.outboundService.findAll(projectId);
    const products = await this.productsService.findAll(projectId);
    const boxes = await this.boxesService.findAll();

    if (boxes.length === 0) {
      throw new BadRequestException(
        '등록된 박스가 없습니다. 박스 관리 메뉴에서 박스를 먼저 등록해주세요.',
      );
    }

    const productMap = new Map(products.map((p) => [p.sku, p]));

    const orderOutbounds = outbounds.filter((o) => o.orderId === orderId);

    if (orderOutbounds.length === 0) {
      throw new BadRequestException(`주문 ID ${orderId}에 대한 출고 정보가 없습니다.`);
    }

    const skuMap = new Map<string, SKU>();

    for (const outbound of orderOutbounds) {
      const product = productMap.get(outbound.sku);
      if (!product) {
        this.logger.warn(`Product not found for SKU: ${outbound.sku}`);
        continue;
      }

      const existing = skuMap.get(product.id);
      if (existing) {
        existing.quantity += outbound.quantity;
      } else {
        skuMap.set(product.id, {
          id: product.id,
          name: product.name,
          width: product.width,
          length: product.length,
          height: product.height,
          quantity: outbound.quantity,
        });
      }
    }

    const skus = Array.from(skuMap.values());

    const result = calculateOrderPacking3D(orderId, skus, boxes, groupLabel);

    await this.savePackingResults3D(projectId, result);

    return result;
  }

  async findByOrderId(projectId: string, orderId: string): Promise<PackingResultEntity[]> {
    return await this.packingResultRepository.findByOrderId(projectId, orderId);
  }

  private async savePackingResults3D(projectId: string, result: PackingResult3D) {
    await this.packingResultRepository.removeAllByProjectAndOrder(projectId, result.orderId);

    const results = result.boxes.map((box) => ({
      projectId,
      orderId: result.orderId,
      boxId: box.boxId,
      boxName: box.boxName,
      boxNumber: box.boxNumber,
      packedCount: box.items.reduce((acc, item) => acc + item.quantity, 0),
      remainingQuantity: 0,
      efficiency: box.efficiency,
      totalCBM: box.totalCBM,
      groupLabel: result.groupLabel,
      placements: box.items.flatMap((item) =>
        item.placements.map((p) => ({
          skuId: item.skuId,
          x: p.x,
          y: p.y,
          z: p.z,
          rotation: p.rotation,
        })),
      ),
    }));

    await this.packingResultRepository.createBulk(results);
  }
}
