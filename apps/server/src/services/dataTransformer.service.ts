import { Injectable } from '@nestjs/common';
import { CreateProductDto } from '../dto/createProduct.dto';
import { OutboundItemDto } from '../dto/confirmUpload.dto';

@Injectable()
export class DataTransformerService {
  transformOutboundRows(
    rows: Record<string, unknown>[],
    columnMapping: Record<string, string>,
  ): OutboundItemDto[] {
    return rows
      .filter((row) => {
        const mapped = this.mapRow(row, columnMapping);
        return mapped.orderId && mapped.sku;
      })
      .flatMap((row) => {
        const mapped = this.mapRow(row, columnMapping);
        const quantity = parseInt(String(mapped.quantity ?? '1'), 10) || 1;

        return [
          {
            orderId: String(mapped.orderId ?? ''),
            sku: String(mapped.sku ?? ''),
            quantity,
            recipientName: mapped.recipientName ? String(mapped.recipientName) : undefined,
            address: mapped.address ? String(mapped.address) : undefined,
          },
        ];
      });
  }

  async transformAndMapOutbound(
    columnMapping: Record<string, string>,
    rows: Record<string, unknown>[],
  ): Promise<{
    parsedOrders: Array<{
      orderId: string;
      quantity: number;
      recipientName: string;
      address: string;
      outboundItems: Array<{
        sku: string;
        quantity: number;
        productId?: string | null;
        productName?: string;
      }>;
    }>;
  }> {
    const transformed = this.transformOutboundRows(rows, columnMapping);

    const orderMap = new Map<
      string,
      {
        orderId: string;
        quantity: number;
        recipientName: string;
        address: string;
        outboundItems: Array<{
          sku: string;
          quantity: number;
          productId?: string | null;
          productName?: string;
        }>;
      }
    >();

    for (const item of transformed) {
      const orderId = item.orderId;

      if (!orderMap.has(orderId)) {
        orderMap.set(orderId, {
          orderId,
          quantity: item.quantity || 1,
          recipientName: item.recipientName || '',
          address: item.address || '',
          outboundItems: [],
        });
      }

      const order = orderMap.get(orderId)!;
      const sku = item.sku.toLowerCase();
      const skuItems = sku.split('\n');

      for (const skuItem of skuItems) {
        const match = skuItem.match(/\((.+?)\s*\/\s*(\d+)ea\)?/);
        if (!match) continue;

        const productName = match[1].trim();
        const quantity = parseInt(match[2], 10);

        order.outboundItems.push({
          sku: productName,
          quantity,
        });
      }
    }

    return {
      parsedOrders: Array.from(orderMap.values()),
    };
  }

  transformProductRows(
    rows: Record<string, unknown>[],
    separator: string = 'x',
  ): CreateProductDto[] {
    return rows
      .filter((row) => row.sku && row.name)
      .map((row) => {
        let width = 0;
        let length = 0;
        let height = 0;

        if (row.dimensions) {
          const dims = String(row.dimensions).trim();
          const cleaned = dims.replace(/(cm|mm|m|in|inch)$/i, '').trim();
          const parts = cleaned.split(separator).map((p) => parseFloat(p.trim()));

          if (parts.length >= 2) {
            width = parts[0] || 0;
            length = parts[1] || 0;
            height = parts[2] ?? 1;
          }
        }

        return {
          sku: String(row.sku || ''),
          name: String(row.name || ''),
          width,
          length,
          height,
        };
      });
  }

  mapRow(
    row: Record<string, unknown>,
    columnMapping: Record<string, string>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [field, columnName] of Object.entries(columnMapping)) {
      if (columnName) {
        result[field] = row[columnName] ?? '';
      }
    }
    return result;
  }
}
