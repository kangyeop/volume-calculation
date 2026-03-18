import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PackingResultEntity } from '../entities/packingResult.entity';
import { PackingResultDetailEntity } from '../entities/packingResultDetail.entity';
import { OutboundBatchEntity } from '../entities/outbound-batch.entity';
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
    @InjectRepository(OutboundBatchEntity)
    private readonly outboundBatchRepository: Repository<OutboundBatchEntity>,
    private readonly outboundService: OutboundService,
    private readonly productsService: ProductsService,
    private readonly boxesService: BoxesService,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async calculate(
    outboundBatchId: string,
    groupingOption: PackingGroupingOption,
    boxGroupId: string,
  ): Promise<PackingRecommendation> {
    this.logger.log(
      `Calculating packing for batch: ${outboundBatchId} with grouping: ${groupingOption}`,
    );

    const outbounds = await this.outboundService.findAll(outboundBatchId);
    const products = await this.productsService.findAllForMatching();
    const boxes = await this.boxesService.findByGroupId(boxGroupId);

    if (boxes.length === 0) {
      throw new BadRequestException(
        '선택한 박스 그룹에 등록된 박스가 없습니다. 박스 관리 메뉴에서 박스를 먼저 등록해주세요.',
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

      const groupOrderId = group[0].orderIdentifier || group[0].orderId;
      const skuToOutbound = new Map<string, { sku: string }>();
      for (const outbound of group) {
        const product =
          (outbound.productId ? productMapById.get(outbound.productId) : undefined) ??
          productMapBySku.get(outbound.sku);
        if (product && !skuToOutbound.has(product.id)) {
          skuToOutbound.set(product.id, { sku: outbound.sku });
        }
      }

      let boxIndex = 1;
      for (const box of boxesWithNames) {
        const boxVol = box.box.width * box.box.length * box.box.height;
        const boxCBM = boxVol / 1_000_000;

        for (let i = 0; i < box.count; i++) {
          for (const packedSku of box.packedSKUs) {
            const product = productMapById.get(packedSku.skuId);
            if (!product) continue;

            const outboundInfo = skuToOutbound.get(packedSku.skuId);
            const efficiency =
              boxVol > 0
                ? (product.width * product.length * product.height * packedSku.quantity) / boxVol
                : 0;

            detailResults.push(
              this.packingResultDetailRepository.create({
                outboundBatchId,
                orderId: groupOrderId,
                recipientName: '',
                sku: outboundInfo?.sku || product.sku,
                productName: product.name,
                quantity: packedSku.quantity,
                boxName: box.box.name,
                boxNumber: i + 1,
                boxIndex,
                boxCBM,
                efficiency,
                unpacked: false,
                unpackedReason: '',
              }),
            );
          }
        }
        boxIndex++;
      }

      for (const item of unpackedWithNames) {
        const outboundInfo = skuToOutbound.get(item.skuId);
        detailResults.push(
          this.packingResultDetailRepository.create({
            outboundBatchId,
            orderId: groupOrderId,
            recipientName: '',
            sku: outboundInfo?.sku || item.skuId,
            productName: item.name,
            quantity: item.quantity,
            boxName: 'Unpacked',
            boxNumber: 0,
            boxIndex: 0,
            boxCBM: 0,
            efficiency: 0,
            unpacked: true,
            unpackedReason: item.reason || '',
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

    const result: PackingRecommendation = {
      groups,
      totalCBM: grandTotalCBM,
      totalEfficiency:
        grandTotalAvailableVolume > 0 ? grandTotalUsedVolume / grandTotalAvailableVolume : 0,
      unpackedItems: allUnpackedItems,
    };

    await this.outboundBatchRepository.update(outboundBatchId, {
      packingRecommendation: result as any,
    });

    return result;
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
    boxGroupId?: string,
  ): Promise<PackingResult3D> {
    this.logger.log(`Calculating 3D packing for order: ${orderId}`);

    const order = await this.ordersRepository.findOneWithRelations(outboundBatchId, orderId);

    if (!order) {
      throw new BadRequestException(`주문 ID ${orderId}에 대한 출고 정보가 없습니다.`);
    }

    const boxes = boxGroupId
      ? await this.boxesService.findByGroupId(boxGroupId)
      : await this.boxesService.findAll();

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
    const batch = await this.outboundBatchRepository.findOne({
      where: { id: outboundBatchId },
    });
    if (!batch?.packingRecommendation) return null;
    return batch.packingRecommendation;
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
