import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { OutboundEntity } from '../entities/outbound.entity';
import { ProductEntity } from '../entities/product.entity';
import { OrderEntity, OrderStatus } from '../entities/order.entity';
import { OutboundItemDto } from '../dto/confirmUpload.dto';
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
    outbounds: OutboundItemDto[],
  ): Promise<{ outbounds: OutboundEntity[] }> {
    const uniqueOrderIds = [...new Set(outbounds.map((dto) => dto.orderId))];
    const orderMap = new Map<string, OrderEntity>();

    for (const orderId of uniqueOrderIds) {
      let order = await this.orderRepository.findOne({
        where: { projectId, orderId },
      });

      if (!order) {
        const outboundsForOrder = outbounds.filter((dto) => dto.orderId === orderId);
        const totalQuantity = outboundsForOrder.reduce((sum, dto) => sum + dto.quantity, 0);
        order = this.orderRepository.create({
          projectId,
          orderId,
          quantity: totalQuantity,
          status: OrderStatus.PENDING,
        });
        order = await this.orderRepository.save(order);
      }

      orderMap.set(orderId, order);
    }

    const outboundEntities = await Promise.all(
      outbounds.map(async (dto) => {
        const product = dto.productId
          ? await this.productRepository.findOne({ where: { id: dto.productId } })
          : null;
        const order = orderMap.get(dto.orderId)!;

        return this.outboundRepository.create({
          sku: product ? product.name : dto.sku,
          quantity: dto.quantity,
          projectId,
          orderId: order.id,
          orderIdentifier: dto.orderId,
          productId: dto.productId ?? null,
        });
      }),
    );

    const savedOutbounds = await this.outboundRepository.manager.save(outboundEntities);
    return { outbounds: savedOutbounds };
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

    const skus = products.map((dto) => dto.sku);
    return this.productRepository
      .createQueryBuilder('product')
      .where('product.projectId = :projectId', { projectId })
      .andWhere('product.sku IN (:...skus)', { skus })
      .getMany();
  }
}
