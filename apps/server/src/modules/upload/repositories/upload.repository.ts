import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OutboundEntity } from '../../outbound/entities/outbound.entity';
import { ProductEntity } from '../../products/entities/product.entity';
import { CreateOutboundDto } from '../../outbound/dto/create-outbound.dto';
import { CreateProductDto } from '../../products/dto/create-product.dto';
import { OrderEntity, OrderStatus } from '../../orders/entities/order.entity';

@Injectable()
export class UploadRepository {
  constructor(private readonly dataSource: DataSource) {}

  async createOutboundsWithOrder(
    projectId: string,
    outbounds: CreateOutboundDto[],
  ): Promise<{ outbounds: OutboundEntity[]; batchId: string; batchName: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const batchId = crypto.randomUUID();
      const batchName = `Upload ${new Date().toLocaleString()}`;

      const uniqueOrderIds = [...new Set(outbounds.map((dto) => dto.orderId))];

      for (const orderId of uniqueOrderIds) {
        const existingOrder = await queryRunner.manager.findOne(OrderEntity, {
          where: { projectId, orderId },
        });

        if (!existingOrder) {
          const firstOutboundForOrder = outbounds.find((dto) => dto.orderId === orderId);
          const order = queryRunner.manager.create(OrderEntity, {
            projectId,
            orderId,
            recipientName: firstOutboundForOrder?.recipientName,
            address: firstOutboundForOrder?.address,
            status: OrderStatus.PENDING,
          });
          await queryRunner.manager.save(order);
        }
      }

      const outboundEntities = outbounds.map((dto) =>
        queryRunner.manager.create(OutboundEntity, {
          ...dto,
          projectId,
          batchId,
          batchName,
        }),
      );

      const savedOutbounds = await queryRunner.manager.save(outboundEntities);
      await queryRunner.commitTransaction();
      return { outbounds: savedOutbounds, batchId, batchName };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createProductsWithUpsert(
    projectId: string,
    products: CreateProductDto[],
  ): Promise<ProductEntity[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const productEntities = products.map((dto) =>
        queryRunner.manager.create(ProductEntity, {
          ...dto,
          projectId,
        }),
      );

      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(ProductEntity)
        .values(productEntities)
        .orUpdate(['name', 'width', 'length', 'height'], ['projectId', 'sku'])
        .execute();

      await queryRunner.commitTransaction();

      return productEntities;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
