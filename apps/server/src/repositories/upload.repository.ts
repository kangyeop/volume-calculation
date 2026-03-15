import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { OutboundItemEntity } from '../entities/outbound-item.entity';
import { ProductEntity } from '../entities/product.entity';
import { OrderEntity, OrderStatus } from '../entities/order.entity';
import { OutboundItemDto } from '../dto/confirmUpload.dto';
import { CreateProductDto } from '../dto/createProduct.dto';

@Injectable()
export class UploadRepository {
  constructor(
    @InjectRepository(OutboundItemEntity)
    private readonly outboundRepository: Repository<OutboundItemEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
  ) {}

  @Transactional()
  async createOutboundsWithOrder(
    outboundBatchId: string,
    outbounds: OutboundItemDto[],
    orderQuantities?: Map<string, number>,
  ): Promise<{ outbounds: OutboundItemEntity[] }> {
    const uniqueOrderIds = [...new Set(outbounds.map((dto) => dto.orderId))];
    const orderMap = new Map<string, OrderEntity>();

    for (const orderId of uniqueOrderIds) {
      let order = await this.orderRepository.findOne({
        where: { outboundBatchId, orderId },
      });

      if (!order) {
        const orderQuantity = orderQuantities?.get(orderId) ?? 1;
        order = this.orderRepository.create({
          outboundBatchId,
          orderId,
          quantity: orderQuantity,
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
          sku: product ? product.sku : dto.sku,
          quantity: dto.quantity,
          outboundBatchId,
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
    productGroupId: string,
    products: CreateProductDto[],
  ): Promise<ProductEntity[]> {
    const productEntities = products.map((dto) =>
      this.productRepository.create({
        ...dto,
        productGroupId,
      }),
    );

    await this.productRepository
      .createQueryBuilder()
      .insert()
      .into(ProductEntity)
      .values(productEntities)
      .orUpdate(['name', 'width', 'length', 'height'], ['productGroupId', 'sku'])
      .execute();

    const skus = products.map((dto) => dto.sku);
    return this.productRepository
      .createQueryBuilder('product')
      .where('product.productGroupId = :productGroupId', { productGroupId })
      .andWhere('product.sku IN (:...skus)', { skus })
      .getMany();
  }
}
