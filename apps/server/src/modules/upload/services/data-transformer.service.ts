import { Injectable } from '@nestjs/common';
import { OutboundItem } from './upload-session.service';
import { CreateProductDto } from '../../products/dto/create-product.dto';

@Injectable()
export class DataTransformerService {
  transformOutboundRows(
    rows: Record<string, unknown>[],
    columnMapping: Record<string, string>,
  ): OutboundItem[] {
    return rows
      .filter((row) => {
        const mapped = this.mapRow(row, columnMapping);
        return mapped.orderId && mapped.sku;
      })
      .flatMap((row) => {
        const mapped = this.mapRow(row, columnMapping);

        return [
          {
            orderId: String(mapped.orderId || ''),
            sku: String(mapped.sku || ''),
            quantity: parseInt(String(mapped.quantity || '1'), 10) || 1,
            recipientName: mapped.recipientName ? String(mapped.recipientName) : undefined,
            address: mapped.address ? String(mapped.address) : undefined,
          },
        ];
      });
  }

  transformProductRows(rows: Record<string, unknown>[], separator: string): CreateProductDto[] {
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
    console.log(row);

    const result: Record<string, unknown> = {};
    for (const [field, columnName] of Object.entries(columnMapping)) {
      if (columnName) {
        result[field] = row[columnName] ?? '';
      }
    }
    return result;
  }
}
