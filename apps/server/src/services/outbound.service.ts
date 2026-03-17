import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { OutboundItemEntity } from '../entities/outbound-item.entity';
import { CreateOutboundDto } from '../dto/createOutbound.dto';
import { OrderEntity, OrderStatus } from '../entities/order.entity';
import { OutboundRepository } from '../repositories/outbound.repository';
import { OrdersRepository } from '../repositories/orders.repository';

@Injectable()
export class OutboundService {
  constructor(
    private readonly outboundRepository: OutboundRepository,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  @Transactional()
  async create(
    outboundBatchId: string,
    createOutboundDto: CreateOutboundDto,
  ): Promise<OutboundItemEntity> {
    let order = await this.ordersRepository.findOne(outboundBatchId, createOutboundDto.orderId);

    if (!order) {
      order = await this.ordersRepository.create({
        outboundBatchId,
        orderId: createOutboundDto.orderId,
        status: OrderStatus.PENDING,
      });
    }

    return await this.outboundRepository.create(outboundBatchId, {
      ...createOutboundDto,
      orderId: order.id,
      orderIdentifier: createOutboundDto.orderId,
    });
  }

  async findAll(outboundBatchId: string): Promise<OutboundItemEntity[]> {
    return await this.outboundRepository.findAll(outboundBatchId);
  }

  async findPaginated(
    outboundBatchId: string,
    page: number,
    limit: number,
  ): Promise<{ items: OutboundItemEntity[]; totalOrders: number; page: number; limit: number }> {
    return this.outboundRepository.findPaginated(outboundBatchId, page, limit);
  }

  async remove(id: string): Promise<void> {
    const removed = await this.outboundRepository.remove(id);
    if (!removed) {
      throw new NotFoundException(`Outbound with ID "${id}" not found`);
    }
  }

  @Transactional()
  async createBulk(
    outboundBatchId: string,
    createOutboundDtos: CreateOutboundDto[],
  ): Promise<{ outbounds: OutboundItemEntity[] }> {
    const uniqueOrderIds = [...new Set(createOutboundDtos.map((dto) => dto.orderId))];
    const orderMap = new Map<string, OrderEntity>();

    for (const orderId of uniqueOrderIds) {
      let order = await this.ordersRepository.findOne(outboundBatchId, orderId);

      if (!order) {
        order = await this.ordersRepository.create({
          outboundBatchId,
          orderId,
          status: OrderStatus.PENDING,
        });
      }

      orderMap.set(orderId, order);
    }

    const outbounds = createOutboundDtos.map((dto) => {
      const order = orderMap.get(dto.orderId)!;
      return {
        ...dto,
        orderId: order.id,
        orderIdentifier: dto.orderId,
        productId: dto.productId ?? null,
      };
    });

    const savedOutbounds = await this.outboundRepository.createBulk(outboundBatchId, outbounds);
    return { outbounds: savedOutbounds };
  }

  async removeAll(outboundBatchId: string): Promise<void> {
    await this.outboundRepository.removeAll(outboundBatchId);
  }

  async getConfigurationSummary(outboundBatchId: string): Promise<{
    totalOrders: number;
    configurations: {
      skuKey: string;
      skuItems: { sku: string; productName?: string; quantity: number }[];
      orderCount: number;
      orderIds: string[];
    }[];
  }> {
    const allOutbounds = await this.outboundRepository.findAll(outboundBatchId);

    const orderMap = new Map<string, { sku: string; productName?: string; quantity: number }[]>();
    for (const outbound of allOutbounds) {
      const orderKey = outbound.orderIdentifier || outbound.orderId;
      if (!orderMap.has(orderKey)) {
        orderMap.set(orderKey, []);
      }
      orderMap.get(orderKey)!.push({
        sku: outbound.sku,
        productName: outbound.product?.name,
        quantity: outbound.quantity,
      });
    }

    const configMap = new Map<
      string,
      { skuItems: { sku: string; productName?: string; quantity: number }[]; orderIds: string[] }
    >();

    for (const [orderId, items] of orderMap.entries()) {
      const sorted = [...items].sort(
        (a, b) => a.sku.localeCompare(b.sku) || a.quantity - b.quantity,
      );
      const skuKey = sorted.map((i) => `${i.sku}:${i.quantity}`).join('|');

      if (!configMap.has(skuKey)) {
        configMap.set(skuKey, { skuItems: sorted, orderIds: [] });
      }
      configMap.get(skuKey)!.orderIds.push(orderId);
    }

    const configurations = Array.from(configMap.entries())
      .map(([skuKey, { skuItems, orderIds }]) => ({
        skuKey,
        skuItems,
        orderCount: orderIds.length,
        orderIds,
      }))
      .sort((a, b) => b.skuItems.length - a.skuItems.length || b.orderCount - a.orderCount);

    return {
      totalOrders: orderMap.size,
      configurations,
    };
  }
}
