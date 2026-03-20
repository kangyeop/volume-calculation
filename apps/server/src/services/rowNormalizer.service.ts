import { Injectable, Logger } from '@nestjs/common';

const ITEM_PATTERN = /^\(?\s*(.+?)\s*\/\s*(\d+)\s*ea\s*\)?$/i;

@Injectable()
export class RowNormalizerService {
  private readonly logger = new Logger(RowNormalizerService.name);

  normalizeRows(
    rows: Record<string, unknown>[],
    columnMapping: Record<string, string>,
  ): Record<string, unknown>[] {
    const skuColumn = columnMapping['sku'];
    const quantityColumn = columnMapping['quantity'];

    if (!skuColumn) {
      return rows;
    }

    const result: Record<string, unknown>[] = [];

    for (const row of rows) {
      const skuValue = String(row[skuColumn] ?? '').trim();

      if (!skuValue) {
        result.push(row);
        continue;
      }

      const orderQuantity = quantityColumn
        ? parseInt(String(row[quantityColumn] ?? '1'), 10) || 1
        : 1;

      const parts = skuValue.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);

      if (parts.length <= 1) {
        const parsed = this.parseItem(skuValue);
        if (parsed) {
          const expandedRow = { ...row };
          expandedRow[skuColumn] = parsed.productName;
          if (quantityColumn) expandedRow[quantityColumn] = parsed.quantity * orderQuantity;
          result.push(expandedRow);
        } else {
          result.push(row);
        }
        continue;
      }

      for (const part of parts) {
        const expandedRow = { ...row };
        const parsed = this.parseItem(part);

        if (parsed) {
          expandedRow[skuColumn] = parsed.productName;
          if (quantityColumn) expandedRow[quantityColumn] = parsed.quantity * orderQuantity;
        } else {
          expandedRow[skuColumn] = part.replace(/^\(|\)$/g, '').trim();
        }

        result.push(expandedRow);
      }
    }

    this.logger.log(`Normalized ${rows.length} rows into ${result.length} rows`);
    return result;
  }

  private parseItem(raw: string): { productName: string; quantity: number } | null {
    const match = raw.match(ITEM_PATTERN);
    if (!match) return null;
    return { productName: match[1].trim(), quantity: parseInt(match[2], 10) || 1 };
  }
}
