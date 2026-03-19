import { Injectable, Logger } from '@nestjs/common';
import { CompoundDetectionResult, ParsedItem } from './schemas/compound-detection.schema';

const KNOWN_PATTERNS: RegExp[] = [
  /^\(?\s*(.+?)\s*\/\s*(\d+)\s*ea\s*\)?$/i,
  /^(.+?)\[(\d+)\]$/,
  /^(.+?)\s*[xX]\s*(\d+)$/,
  /^(.+?)\((\d+)개\)$/,
];

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

    let aiRegex: RegExp | null = null;
    if (detection.itemPattern) {
      try {
        aiRegex = new RegExp(detection.itemPattern);
      } catch {
        this.logger.warn(`Invalid regex from AI: "${detection.itemPattern}"`);
      }
    }

    const parsedLookup = this.buildParsedLookup(detection.parsedSamples);
    const delimiter = this.unescapeDelimiter(detection.delimiter || ',');
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
        const { productName, quantity } = this.parseItem(part, aiRegex, parsedLookup);

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
    aiRegex: RegExp | null,
    parsedLookup: Map<string, ParsedItem>,
  ): { productName: string; quantity: number | null } {
    for (const pattern of KNOWN_PATTERNS) {
      const match = raw.match(pattern);
      if (match && match[1]) {
        const productName = match[1].trim();
        const qtyParsed = match[2] !== undefined ? parseInt(match[2], 10) : NaN;
        return { productName, quantity: isNaN(qtyParsed) ? 1 : qtyParsed };
      }
    }

    if (aiRegex) {
      const match = raw.match(aiRegex);
      if (match) {
        const groups = match.slice(1).filter((g) => g !== undefined);
        if (groups.length > 0) {
          const productName = groups[0].trim();
          const qtyParsed = groups.length > 1 ? parseInt(groups[1], 10) : NaN;
          return { productName, quantity: isNaN(qtyParsed) ? null : qtyParsed };
        }
      }
    }

    const cached = parsedLookup.get(raw.trim());
    if (cached) {
      return { productName: cached.productName, quantity: cached.quantity };
    }

    return { productName: raw.replace(/^\(|\)$/g, '').trim(), quantity: null };
  }

  private unescapeDelimiter(delimiter: string): string {
    return delimiter
      .replace(/\\r\\n/g, '\r\n')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');
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
