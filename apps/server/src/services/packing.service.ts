import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PackingResultEntity } from '../entities/packingResult.entity';
import { PackingResultDetailEntity } from '../entities/packingResultDetail.entity';
import { OutboundService } from './outbound.service';
import { ProductsService } from './products.service';
import { BoxesService } from './boxes.service';
import {
  calculatePacking,
  calculateOrderPackingUnified,
} from '../modules/packing/algorithms/packing.algorithm';
import {
  SKU,
  PackingRecommendation,
  PackingGroup,
  PackingResult3DLegacy as PackingResult3D,
  PackingGroupingOption,
} from '@wms/types';
import { OutboundItemEntity } from '../entities/outbound-item.entity';
import { PackingResultsRepository } from '../repositories/packing-results.repository';
import { PackingResultDetailsRepository } from '../repositories/packing-result-details.repository';
import { OrdersRepository } from '../repositories/orders.repository';

@Injectable()
export class PackingService {
  private readonly logger = new Logger(PackingService.name);

  constructor(
    private readonly packingResultRepository: PackingResultsRepository,
    private readonly packingResultDetailRepository: PackingResultDetailsRepository,
    private readonly outboundService: OutboundService,
    private readonly productsService: ProductsService,
    private readonly boxesService: BoxesService,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async calculate(
    outboundBatchId: string,
    groupingOption: PackingGroupingOption,
  ): Promise<PackingRecommendation> {
    this.logger.log(
      `Calculating packing for batch: ${outboundBatchId} with grouping: ${groupingOption}`,
    );

    const outbounds = await this.outboundService.findAll(outboundBatchId);
    const products = await this.productsService.findAllForMatching();
    const boxes = await this.boxesService.findAll();

    if (boxes.length === 0) {
      throw new BadRequestException(
        '등록된 박스가 없습니다. 박스 관리 메뉴에서 박스를 먼저 등록해주세요.',
      );
    }

    const productMapById = new Map(products.map((p) => [p.id, p]));
    const productMapBySku = new Map(products.map((p) => [p.sku, p]));

    const groupedOutbounds = this.groupOutbounds(outbounds, groupingOption);

    const groups: PackingGroup[] = [];
    let grandTotalCBM = 0;
    let grandTotalUsedVolume = 0;
    let grandTotalAvailableVolume = 0;

    const detailResults: PackingResultDetailEntity[] = [];

    await this.packingResultRepository.removeAll(outboundBatchId);
    await this.packingResultDetailRepository.removeAll(outboundBatchId);

    for (const group of groupedOutbounds) {
      if (group.length === 0) continue;

      const skus: SKU[] = group
        .map((o) => {
          const product =
            (o.productId ? productMapById.get(o.productId) : undefined) ??
            productMapBySku.get(o.sku);
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
        boxVolMap.set(rb.box.name, boxVol);
        groupAvailableVolume += boxVol * rb.count;
        for (const packedSku of rb.packedSKUs) {
          const product = productMapById.get(packedSku.skuId);
          if (product) {
            groupUsedVolume += product.width * product.length * product.height * packedSku.quantity;
          }
        }
      }

      const boxesWithNames = recommendation.boxes.map((box) => ({
        ...box,
        packedSKUs: box.packedSKUs.map((sku) => {
          const product = productMapById.get(sku.skuId);
          return {
            ...sku,
            name: product ? product.name : 'Unknown Product',
          };
        }),
      }));

      const unpackedWithNames = recommendation.unpackedItems.map((item) => {
        const product = productMapById.get(item.skuId);
        return {
          ...item,
          name: product ? product.name : 'Unknown Product',
        };
      });

      let boxIndex = 1;
      const skuToBoxMap = new Map<
        string,
        { boxName: string; boxNumber: number; boxIndex: number }
      >();
      for (const box of boxesWithNames) {
        for (let i = 0; i < box.count; i++) {
          for (const packedSku of box.packedSKUs) {
            if (!skuToBoxMap.has(packedSku.skuId)) {
              skuToBoxMap.set(packedSku.skuId, {
                boxName: box.box.name,
                boxNumber: i + 1,
                boxIndex,
              });
            }
          }
        }
        boxIndex++;
      }

      for (const outbound of group) {
        const product =
          (outbound.productId ? productMapById.get(outbound.productId) : undefined) ??
          productMapBySku.get(outbound.sku);
        if (!product) continue;

        const boxInfo = skuToBoxMap.get(product.id) || {
          boxName: unpackedWithNames.length > 0 ? 'Unpacked' : 'Unknown',
          boxNumber: 0,
          boxIndex: 0,
        };

        const unpackedItem = unpackedWithNames.find(
          (u) => u.skuId === product.id && u.quantity > 0,
        );
        const isUnpacked = !!unpackedItem;

        const boxCBM = boxInfo.boxIndex > 0 ? (boxVolMap.get(boxInfo.boxName) || 0) / 1_000_000 : 0;

        const efficiency =
          boxInfo.boxIndex > 0
            ? (product.width * product.length * product.height * outbound.quantity) /
              (boxVolMap.get(boxInfo.boxName) || 1)
            : 0;

        detailResults.push(
          this.packingResultDetailRepository.create({
            outboundBatchId,
            orderId: outbound.orderIdentifier || outbound.orderId,
            recipientName: '',
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

      if (detailResults.length > 0) {
        await this.packingResultDetailRepository.createBulk(detailResults);
        detailResults.length = 0;
      }

      const groupResultRows: Array<{
        outboundBatchId: string;
        orderId?: string;
        boxName: string;
        packedCount: number;
        efficiency: number;
        totalCBM: number;
        groupLabel?: string;
      }> = [];

      for (const box of boxesWithNames) {
        const boxVol = box.box.width * box.box.length * box.box.height;
        const usedVol = box.packedSKUs.reduce((acc, s) => {
          const product = productMapById.get(s.skuId);
          return acc + (product ? product.width * product.length * product.height * s.quantity : 0);
        }, 0);

        for (let i = 0; i < box.count; i++) {
          groupResultRows.push({
            outboundBatchId,
            orderId: groupLabel,
            boxName: box.box.name,
            packedCount: box.packedSKUs.reduce((a, s) => a + s.quantity, 0),
            efficiency: boxVol > 0 ? usedVol / boxVol : 0,
            totalCBM: boxVol / 1_000_000,
            groupLabel,
          });
        }
      }

      if (groupResultRows.length > 0) {
        await this.packingResultRepository.createBulk(groupResultRows);
      }
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

  private groupOutbounds(outbounds: OutboundItemEntity[], option: string): OutboundItemEntity[][] {
    const groups = new Map<string, OutboundItemEntity[]>();

    for (const outbound of outbounds) {
      let key = '';
      const orderIdentifier = outbound.orderIdentifier || outbound.orderId;
      const recipientName = outbound.order?.recipientName || 'Unknown Recipient';

      switch (option) {
        case 'ORDER':
          key = `order:${orderIdentifier}`;
          break;
        case 'RECIPIENT':
          key = `recipient:${recipientName}`;
          break;
        case 'ORDER_RECIPIENT':
          key = `order_recipient:${orderIdentifier}_${recipientName}`;
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

  private generateGroupLabel(outbound: OutboundItemEntity, option: string): string {
    const orderIdentifier = outbound.orderIdentifier || outbound.orderId;
    const recipientName = outbound.order?.recipientName || 'Unknown Recipient';

    switch (option) {
      case 'ORDER':
        return `Order: ${orderIdentifier}`;
      case 'RECIPIENT':
        return `Recipient: ${recipientName}`;
      case 'ORDER_RECIPIENT':
        return `Order: ${orderIdentifier}, Recipient: ${recipientName}`;
      default:
        return 'Default Group';
    }
  }

  async findAll(outboundBatchId: string): Promise<PackingResultEntity[]> {
    return await this.packingResultRepository.findAll(outboundBatchId);
  }

  async calculateOrderPacking(
    outboundBatchId: string,
    orderId: string,
    groupLabel?: string,
  ): Promise<PackingResult3D> {
    this.logger.log(`Calculating 3D packing for order: ${orderId}`);

    const order = await this.ordersRepository.findOneWithRelations(outboundBatchId, orderId);

    if (!order) {
      throw new BadRequestException(`주문 ID ${orderId}에 대한 출고 정보가 없습니다.`);
    }

    const boxes = await this.boxesService.findAll();

    if (boxes.length === 0) {
      throw new BadRequestException(
        '등록된 박스가 없습니다. 박스 관리 메뉴에서 박스를 먼저 등록해주세요.',
      );
    }

    const skuMap = new Map<string, SKU>();

    for (const outbound of order.outbounds) {
      const product = outbound.product;
      if (!product) {
        this.logger.warn(
          `Product not found for SKU: ${outbound.sku} (Outbound ID: ${outbound.id})`,
        );
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

    if (skus.length === 0) {
      throw new BadRequestException(`주문 ID ${orderId}에 포장할 수 있는 유효한 상품이 없습니다.`);
    }

    const result = calculateOrderPackingUnified(orderId, skus, boxes, groupLabel || order.orderId);

    await this.savePackingResults3D(outboundBatchId, result);

    return result;
  }

  async findByOrderId(outboundBatchId: string, orderId: string): Promise<PackingResultEntity[]> {
    return await this.packingResultRepository.findByOrderId(outboundBatchId, orderId);
  }

  async findAllDetails(outboundBatchId: string): Promise<PackingResultDetailEntity[]> {
    return await this.packingResultDetailRepository.findAll(outboundBatchId);
  }

  async getRecommendation(outboundBatchId: string): Promise<PackingRecommendation | null> {
    const details = await this.packingResultDetailRepository.findAll(outboundBatchId);
    if (details.length === 0) return null;

    const allBoxes = await this.boxesService.findAll();
    const boxByName = new Map(allBoxes.map((b) => [b.name, b]));

    const groupMap = new Map<string, PackingResultDetailEntity[]>();
    for (const d of details) {
      if (!groupMap.has(d.orderId)) groupMap.set(d.orderId, []);
      groupMap.get(d.orderId)!.push(d);
    }

    const groups: PackingGroup[] = [];
    let grandTotalCBM = 0;
    let grandTotalEff = 0;
    let grandBoxCount = 0;

    for (const [orderId, items] of groupMap) {
      const unpackedItems = items
        .filter((d) => d.unpacked)
        .map((d) => ({ skuId: d.sku, name: d.productName, quantity: d.quantity, reason: d.unpackedReason }));

      const packedItems = items.filter((d) => !d.unpacked);

      const boxCountMap = new Map<string, number>();
      for (const d of packedItems) {
        boxCountMap.set(d.boxName, Math.max(boxCountMap.get(d.boxName) ?? 0, d.boxNumber));
      }

      const boxSkuMap = new Map<string, Map<string, { name: string; quantity: number }>>();
      for (const d of packedItems) {
        if (!boxSkuMap.has(d.boxName)) boxSkuMap.set(d.boxName, new Map());
        const skuMap = boxSkuMap.get(d.boxName)!;
        const existing = skuMap.get(d.sku);
        if (existing) {
          existing.quantity += d.quantity;
        } else {
          skuMap.set(d.sku, { name: d.productName, quantity: d.quantity });
        }
      }

      const physBoxEff = new Map<string, number>();
      for (const d of packedItems) {
        const key = `${d.boxName}:${d.boxNumber}`;
        physBoxEff.set(key, (physBoxEff.get(key) ?? 0) + d.efficiency);
      }
      const effValues = Array.from(physBoxEff.values());
      const groupEfficiency =
        effValues.length > 0 ? effValues.reduce((a, b) => a + b, 0) / effValues.length : 0;

      let groupCBM = 0;
      const groupBoxes: PackingGroup['boxes'] = [];

      for (const [boxName, count] of boxCountMap) {
        const box = boxByName.get(boxName);
        if (!box) continue;

        groupCBM += ((box.width * box.length * box.height) / 1_000_000) * count;

        const skuMap = boxSkuMap.get(boxName) ?? new Map();
        const packedSKUs = Array.from(skuMap.entries()).map(([skuId, { name, quantity }]) => ({
          skuId,
          name,
          quantity,
        }));

        groupBoxes.push({ box, count, packedSKUs });
      }

      groups.push({
        groupLabel: `Order: ${orderId}`,
        boxes: groupBoxes,
        unpackedItems,
        totalCBM: groupCBM,
        totalEfficiency: groupEfficiency,
      });

      grandTotalCBM += groupCBM;
      grandTotalEff += groupEfficiency * effValues.length;
      grandBoxCount += effValues.length;
    }

    return {
      groups,
      totalCBM: grandTotalCBM,
      totalEfficiency: grandBoxCount > 0 ? grandTotalEff / grandBoxCount : 0,
      unpackedItems: groups.flatMap((g) => g.unpackedItems),
    };
  }

  private async savePackingResults3D(outboundBatchId: string, result: PackingResult3D) {
    await this.packingResultRepository.removeAllByBatchAndOrder(outboundBatchId, result.orderId);

    const results = result.boxes.map((box) => ({
      outboundBatchId,
      orderId: result.orderId,
      boxId: box.boxId,
      boxName: box.boxName,
      boxNumber: box.boxNumber,
      packedCount: box.items.reduce((acc, item) => acc + item.quantity, 0),
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
