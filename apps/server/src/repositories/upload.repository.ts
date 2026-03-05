import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { OutboundEntity } from '../entities/outbound.entity';
import { ProductEntity } from '../entities/product.entity';
import { OrderEntity, OrderStatus } from '../entities/order.entity';
import { CreateOutboundDto } from '../dto/createOutbound.dto';
import { CreateProductDto } from '../dto/createProduct.dto';

@Injectable()
export class UploadRepository {
  constructor(
    @InjectRepository(OutboundEntity)
    private readonly outboundRepository: Repository<OutboundEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
  ) {}

  @Transactional()
  async createOutboundsWithOrder(
    projectId: string,
    outbounds: CreateOutboundDto[],
  ): Promise<{ outbounds: OutboundEntity[]; batchId: string; batchName: string }> {
    const batchId = crypto.randomUUID();
    const batchName = `Upload ${new Date().toLocaleString()}`;

    const uniqueOrderIds = [...new Set(outbounds.map((dto) => dto.orderId))];
    const orderMap = new Map<string, OrderEntity>();

    for (const orderId of uniqueOrderIds) {
      let order = await this.orderRepository.findOne({
        where: { projectId, orderId },
      });

      if (!order) {
        const firstOutboundForOrder = outbounds.find((dto) => dto.orderId === orderId);
        order = this.orderRepository.create({
          projectId,
          orderId,
          quantity: firstOutboundForOrder?.quantity || 1,
          recipientName: firstOutboundForOrder?.recipientName,
          address: firstOutboundForOrder?.address,
          status: OrderStatus.PENDING,
        });
        order = await this.orderRepository.save(order);
      }

      orderMap.set(orderId, order);
    }

    const outboundEntities = outbounds.map((dto) =>
      this.outboundRepository.create({
        ...dto,
        projectId,
        batchId,
        batchName,
        orderId: orderMap.get(dto.orderId)!.id,
      }),
    );

    const savedOutbounds = await this.outboundRepository.manager.save(outboundEntities);
    return { outbounds: savedOutbounds, batchId, batchName };
  }

  @Transactional()
  async createProductsWithUpsert(
    projectId: string,
    products: CreateProductDto[],
  ): Promise<ProductEntity[]> {
    const productEntities = products.map((dto) =>
      this.productRepository.create({
        ...dto,
        projectId,
      }),
    );

    await this.productRepository
      .createQueryBuilder()
      .insert()
      .into(ProductEntity)
      .values(productEntities)
      .orUpdate(['name', 'width', 'length', 'height'], ['projectId', 'sku'])
      .execute();

    return productEntities;
  }
}
