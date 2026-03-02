import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { DataTransformerService } from './data-transformer.service';
import { UploadSessionService } from './upload-session.service';
import { ProductsService } from '../../products/products.service';
import { OutboundService } from '../../outbound/outbound.service';
import { ProductEntity } from '../../products/entities/product.entity';
import { OutboundEntity } from '../../outbound/entities/outbound.entity';
import type { ProductMappingData, ConfirmMappingUploadData } from '@wms/types';

@Injectable()
export class UploadMappingService {
  constructor(
    private readonly dataTransformerService: DataTransformerService,
    private readonly uploadSessionService: UploadSessionService,
    private readonly productsService: ProductsService,
    @Inject(forwardRef(() => OutboundService))
    private readonly outboundService: OutboundService,
  ) {}

  async updateColumnMapping(
    sessionId: string,
    columnMapping: Record<string, string | null>,
  ): Promise<void> {
    const session = this.uploadSessionService.getSession(sessionId);
    if (!session) {
      throw new BadRequestException('Session not found or expired');
    }

    const cleanColumnMapping: Record<string, string> = {};
    for (const [field, columnName] of Object.entries(columnMapping)) {
      if (columnName) {
        cleanColumnMapping[field] = columnName;
      }
    }

    const transformedData = this.dataTransformerService.transformOutboundRows(
      session.rows,
      cleanColumnMapping,
    );

    this.uploadSessionService.updateTransformedData(sessionId, transformedData);
    this.uploadSessionService.updateColumnMapping(sessionId, cleanColumnMapping);
  }

  async updateProductMapping(
    sessionId: string,
    columnMapping: Record<string, string | null>,
  ): Promise<ProductMappingData> {
    const session = this.uploadSessionService.getSession(sessionId);
    if (!session) {
      throw new BadRequestException('Session not found or expired');
    }

    const cleanColumnMapping: Record<string, string> = {};
    for (const [field, columnName] of Object.entries(columnMapping)) {
      if (columnName) {
        cleanColumnMapping[field] = columnName;
      }
    }

    const transformedData = this.dataTransformerService.transformOutboundRows(
      session.rows,
      cleanColumnMapping,
    );

    let productMappingRecord: Record<number, string[]> = {};
    let productMappingWithOrderId: Array<{
      outboundItemIndex: number;
      orderId?: string;
      productIds?: string[] | null;
    }> = [];

    const outboundItems = transformedData.map((item) => ({
      availableFields: {
        orderId: item.orderId,
        sku: item.sku,
        quantity: String(item.quantity),
        ...(item.recipientName ? { recipientName: item.recipientName } : {}),
        ...(item.address ? { address: item.address } : {}),
      } as Record<string, string>,
    }));

    for (const item of outboundItems) {
      const skuItems = item.availableFields.sku.toLowerCase();

      const skuItemList = skuItems.split('\n');

      for (const sku of skuItemList) {
        const [name, count] = sku.split('/');

        const trimmedName = name.trim();
        const trimmedCount = parseInt(count?.trim() || '1', 10) || 1;

        const products = await this.productsService.findBySku(session.projectId, trimmedName);

        if (products.length > 0) {
          const productIds = products.map((p: ProductEntity) => p.id);
          const index = transformedData.findIndex(
            (data) =>
              data.sku.toLowerCase() === item.availableFields.sku.toLowerCase() &&
              data.quantity === trimmedCount,
          );
          if (index !== -1) {
            productMappingRecord[index] = productIds;
          }
        }
      }
    }

    this.uploadSessionService.updateProductMapping(sessionId, productMappingRecord);

    return {
      results: productMappingWithOrderId,
    };
  }

  async confirmMappingUpload(
    sessionId: string,
    _columnMapping: Record<string, string | null>,
    productMapping?: Record<number, string[] | null>,
  ): Promise<ConfirmMappingUploadData> {
    const session = this.uploadSessionService.getSession(sessionId);
    if (!session) {
      throw new BadRequestException('Session not found or expired');
    }

    const transformedData = session.transformedData;
    if (!transformedData || transformedData.length === 0) {
      throw new BadRequestException(
        'No transformed data found. Please call updateColumnMapping first.',
      );
    }

    const sessionProductMapping = session.productMapping || {};
    const requestProductMapping = productMapping || {};

    const finalProductMapping = { ...sessionProductMapping, ...requestProductMapping };

    const outboundDtos = transformedData.map((item, index) => {
      const productIds = finalProductMapping[index];
      return {
        orderId: item.orderId,
        sku: item.sku,
        quantity: item.quantity,
        recipientName: item.recipientName,
        address: item.address,
        productId: productIds?.[0] ?? null,
      };
    });

    const { outbounds, batchId, batchName } = await this.outboundService.createBulk(
      session.projectId,
      outboundDtos,
    );

    const mappedCount = outbounds.filter((r: OutboundEntity) => r.productId !== null).length;
    const unmappedCount = outbounds.length - mappedCount;
    const uniqueOrderIds = Array.from(
      new Set(outbounds.map((r: OutboundEntity) => r.orderId).filter(Boolean)),
    ) as string[];

    this.uploadSessionService.cleanup(sessionId);

    return {
      imported: outbounds.length,
      batchId,
      batchName,
      mappedCount,
      unmappedCount,
      orderIds: uniqueOrderIds,
    };
  }
}
