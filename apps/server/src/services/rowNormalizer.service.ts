import { Injectable, Logger } from '@nestjs/common';
import { CompoundDetectionResult } from './schemas/compound-detection.schema';

@Injectable()
export class RowNormalizerService {
  private readonly logger = new Logger(RowNormalizerService.name);

  normalizeRows(
    rows: Record<string, unknown>[],
    columnMapping: Record<string, string>,
    detection: CompoundDetectionResult | null,
  ): Record<string, unknown>[] {
    if (!detection || !detection.detected) {
      return rows;
    }

    const skuColumn = columnMapping['sku'];
    const quantityColumn = columnMapping['quantity'];

    if (!skuColumn) {
      return rows;
    }

    let regex: RegExp | null = null;
    if (detection.itemPattern) {
      try {
        regex = new RegExp(detection.itemPattern);
      } catch {
        this.logger.warn(`Invalid regex from AI: "${detection.itemPattern}", skipping normalization`);
        return rows;
      }
    }

    const delimiter = detection.delimiter || ',';
    const result: Record<string, unknown>[] = [];

    for (const row of rows) {
      const skuValue = String(row[skuColumn] ?? '').trim();

      if (!skuValue) {
        result.push(row);
        continue;
      }

      const parts = skuValue.split(delimiter).map((p) => p.trim()).filter(Boolean);

      if (parts.length <= 1) {
        result.push(row);
        continue;
      }

      for (const part of parts) {
        const expandedRow = { ...row };
        let productName = part;
        let quantity: number | null = null;

        if (regex) {
          const match = part.match(regex);
          if (match) {
            productName = (match[1] ?? part).trim();
            if (match[2] !== undefined) {
              const parsed = parseInt(match[2], 10);
              quantity = parsed > 0 ? parsed : 1;
            }
          }
        }

        expandedRow[skuColumn] = productName;
        if (quantity !== null && quantityColumn) {
          expandedRow[quantityColumn] = quantity;
        }

        result.push(expandedRow);
      }
    }

    this.logger.log(`Normalized ${rows.length} rows into ${result.length} rows`);
    return result;
  }
}
