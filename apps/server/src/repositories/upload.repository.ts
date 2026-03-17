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

    const productIds = [...new Set(outbounds.map((dto) => dto.productId).filter(Boolean))] as string[];
    const productMap = new Map<string, ProductEntity>();
    if (productIds.length > 0) {
      const products = await this.productRepository.findByIds(productIds);
      for (const p of products) {
        productMap.set(p.id, p);
      }
    }

    const outboundEntities = outbounds.map((dto) => {
      const product = dto.productId ? productMap.get(dto.productId) : null;
      const order = orderMap.get(dto.orderId)!;

      return this.outboundRepository.create({
        sku: product ? product.sku : dto.sku,
        quantity: dto.quantity,
        outboundBatchId,
        orderId: order.id,
        orderIdentifier: dto.orderId,
        productId: dto.productId ?? null,
      });
    });

    const CHUNK_SIZE = 500;
    const savedOutbounds: OutboundItemEntity[] = [];
    for (let i = 0; i < outboundEntities.length; i += CHUNK_SIZE) {
      const chunk = outboundEntities.slice(i, i + CHUNK_SIZE);
      const saved = await this.outboundRepository.manager.save(chunk);
      savedOutbounds.push(...saved);
    }
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
