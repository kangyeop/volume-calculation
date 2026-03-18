import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrderEntity } from '../entities/order.entity';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly repository: Repository<OrderEntity>,
  ) {}

  async create(order: Partial<OrderEntity>): Promise<OrderEntity> {
    const entity = this.repository.create(order);
    return await this.repository.save(entity);
  }

  async findOne(outboundBatchId: string, orderId: string): Promise<OrderEntity | null> {
    return await this.repository.findOne({ where: { outboundBatchId, orderId } });
  }

  async findOneWithRelations(
    outboundBatchId: string,
    orderId: string,
  ): Promise<OrderEntity | null> {
    return await this.repository.findOne({
      where: { outboundBatchId, orderId },
      relations: ['outbounds', 'outbounds.product'],
    });
  }

  async update(id: string, order: Partial<OrderEntity>): Promise<OrderEntity> {
    await this.repository.update(id, order);
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`Order with ID "${id}" not found`);
    }
    return entity;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async findByOrderIds(outboundBatchId: string, orderIds: string[]): Promise<OrderEntity[]> {
    if (orderIds.length === 0) return [];
    return this.repository.find({
      where: { outboundBatchId, orderId: In(orderIds) },
    });
  }

  async createBulk(orders: Partial<OrderEntity>[]): Promise<OrderEntity[]> {
    if (orders.length === 0) return [];
    const CHUNK_SIZE = 500;
    const saved: OrderEntity[] = [];
    for (let i = 0; i < orders.length; i += CHUNK_SIZE) {
      const chunk = orders.slice(i, i + CHUNK_SIZE).map((o) => this.repository.create(o));
      const result = await this.repository.save(chunk);
      saved.push(...result);
    }
    return saved;
  }
}
