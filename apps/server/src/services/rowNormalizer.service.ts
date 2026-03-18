import { Injectable, Logger } from '@nestjs/common';
import { CompoundDetectionResult, ParsedItem } from './schemas/compound-detection.schema';

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
        this.logger.warn(`Invalid regex from AI: "${detection.itemPattern}", falling back to AI-parsed samples`);
      }
    }

    const parsedLookup = this.buildParsedLookup(detection.parsedSamples);
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
        const { productName, quantity } = this.parseItem(part, regex, parsedLookup);

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

  private parseItem(
    raw: string,
    regex: RegExp | null,
    parsedLookup: Map<string, ParsedItem>,
  ): { productName: string; quantity: number | null } {
    if (regex) {
      const match = raw.match(regex);
      if (match && match[1]) {
        const productName = match[1].trim();
        const quantity = match[2] !== undefined ? (parseInt(match[2], 10) || 1) : null;
        return { productName, quantity };
      }
    }

    const cached = parsedLookup.get(raw.trim());
    if (cached) {
      return { productName: cached.productName, quantity: cached.quantity };
    }

    return { productName: raw, quantity: null };
  }

  private buildParsedLookup(samples: ParsedItem[] | null): Map<string, ParsedItem> {
    const map = new Map<string, ParsedItem>();
    if (!samples) return map;
    for (const sample of samples) {
      map.set(sample.raw.trim(), sample);
    }
    return map;
  }
}
