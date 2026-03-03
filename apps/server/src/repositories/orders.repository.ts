import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async findOne(projectId: string, orderId: string): Promise<OrderEntity | null> {
    return await this.repository.findOne({ where: { projectId, orderId } });
  }

  async findOneWithRelations(projectId: string, orderId: string): Promise<OrderEntity | null> {
    return await this.repository.findOne({
      where: { projectId, orderId },
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
}
