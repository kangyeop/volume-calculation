import * as uploadSession from '@/lib/services/upload-session';
import * as templateMatcher from '@/lib/services/template-matcher';
import * as outboundBatchesService from '@/lib/services/outbound-batches';
import * as outboundService from '@/lib/services/outbound';
import * as productsService from '@/lib/services/products';
import * as aiService from '@/lib/services/ai';
import { parseExcelFile } from '@/lib/services/excel';
import type {
  ParseOutboundResponse,
  ProcessOutboundRequest,
  OutboundUploadResult,
  UnmatchedItem,
  ProductMatchResult,
  ProductMappingData,
} from '@/types';

function normalizeRows(
  rows: Record<string, unknown>[],
  columnMapping: Record<string, string>,
): Record<string, unknown>[] {
  return rows.map((row) => {
    const normalized: Record<string, unknown> = { ...row };
    for (const [field, colName] of Object.entries(columnMapping)) {
      if (colName && row[colName] !== undefined) {
        normalized[field] = row[colName];
      }
    }
    return normalized;
  });
}

function transformParsedOrders(
  columnMapping: Record<string, string>,
  normalizedRows: Record<string, unknown>[],
): { parsedOrders: { orderId: string; outboundItems: { sku: string; quantity: number }[] }[] } {
  const orderMap = new Map<string, { sku: string; quantity: number }[]>();

  for (const row of normalizedRows) {
    const orderId = String(row['orderId'] || row[columnMapping['orderId']] || '').trim();
    const sku = String(row['sku'] || row[columnMapping['sku']] || '').trim();
    const quantity = Number(row['quantity'] || row[columnMapping['quantity']] || 0);

    if (!orderId || !sku) continue;

    if (!orderMap.has(orderId)) orderMap.set(orderId, []);
    orderMap.get(orderId)!.push({ sku, quantity: quantity || 1 });
  }

  const parsedOrders = Array.from(orderMap.entries()).map(([orderId, outboundItems]) => ({
    orderId,
    outboundItems,
  }));

  return { parsedOrders };
}

export async function parseForPreview(
  buffer: Buffer,
  originalName: string,
): Promise<ParseOutboundResponse> {
  const parseResult = parseExcelFile(buffer, originalName);
  const fileName = Buffer.from(originalName, 'latin1').toString('utf8');
  const sampleRows = parseResult.rows.slice(0, 30);

  const match = await templateMatcher.findBestMatch(parseResult.headers, 'outbound');

  let suggestedMapping: ParseOutboundResponse['suggestedMapping'];
  let matchedTemplate: ParseOutboundResponse['matchedTemplate'] = null;
  let source: 'template' | 'ai';

  if (match) {
    const mappingEntries: Record<string, { columnName: string } | null> = {};
    for (const [field, columnName] of Object.entries(match.template.columnMapping)) {
      mappingEntries[field] = { columnName };
    }
    suggestedMapping = {
      mapping: mappingEntries,
      unmappedColumns: parseResult.headers.filter(
        (h) => !Object.values(match.template.columnMapping).includes(h),
      ),
    };
    matchedTemplate = {
      id: match.template.id,
      name: match.template.name,
      similarity: match.similarity,
    };
    source = 'template';
  } else {
    suggestedMapping = await aiService.mapOutboundColumns(parseResult.headers, sampleRows);
    source = 'ai';
  }

  const sessionId = crypto.randomUUID();

  await uploadSession.store(sessionId, {
    rows: parseResult.rows,
    headers: parseResult.headers,
    fileName,
  });

  return {
    sessionId,
    headers: parseResult.headers,
    sampleRows,
    rowCount: parseResult.rowCount,
    fileName,
    suggestedMapping,
    matchedTemplate,
    source,
  };
}

export async function processConfirmed(
  request: ProcessOutboundRequest,
): Promise<OutboundUploadResult> {
  const session = await uploadSession.retrieve(request.sessionId);
  if (!session) {
    throw new Error('Session expired or not found');
  }

  const normalizedRows = normalizeRows(session.rows, request.columnMapping);
  const { parsedOrders } = transformParsedOrders(request.columnMapping, normalizedRows);

  const batchName = await outboundBatchesService.generateBatchName(session.fileName);
  const batch = await outboundBatchesService.create(batchName);

  const allProducts = await productsService.findAllForMatching();
  const productByName = new Map(allProducts.map((p) => [p.name, p]));
  const productBySku = new Map(allProducts.map((p) => [p.sku, p]));

  const unmatched: UnmatchedItem[] = [];
  const outbounds: { orderId: string; sku: string; quantity: number; productId?: string | null }[] = [];

  for (const order of parsedOrders) {
    for (const item of order.outboundItems) {
      const matched = productByName.get(item.sku) || productBySku.get(item.sku);

      if (matched) {
        outbounds.push({
          orderId: order.orderId,
          sku: item.sku,
          quantity: item.quantity,
          productId: matched.id,
        });
      } else {
        unmatched.push({ sku: item.sku, quantity: item.quantity, reason: 'Product not found' });
      }
    }
  }

  if (outbounds.length > 0) {
    await outboundService.createOutboundsWithOrder(batch.id, outbounds);
  }

  if (request.saveAsTemplate && request.templateName) {
    await templateMatcher.save({
      name: request.templateName,
      type: 'outbound',
      headers: session.headers,
      columnMapping: request.columnMapping,
      rowStructure: 'single',
      compoundPattern: null,
    });
  }

  if (request.matchedTemplateId) {
    await templateMatcher.incrementUsage(request.matchedTemplateId);
  }

  await uploadSession.remove(request.sessionId);

  return {
    imported: outbounds.length,
    unmatched,
    batchName: batch.name,
    batchId: batch.id,
    totalRows: session.rows.length,
  };
}

export async function confirmUpload(dto: {
  outboundBatchId: string;
  outbounds: { orderId: string; sku: string; quantity: number; productId?: string | null }[];
}): Promise<{ imported: number }> {
  const { outbounds } = await outboundService.createOutboundsWithOrder(dto.outboundBatchId, dto.outbounds);
  return { imported: outbounds.length };
}

export async function mapProducts(
  columnMapping: Record<string, string | null>,
  rows: Record<string, unknown>[],
): Promise<ProductMappingData> {
  const validMapping: Record<string, string> = {};
  for (const [k, v] of Object.entries(columnMapping)) {
    if (v !== null) validMapping[k] = v;
  }

  const normalizedRows = normalizeRows(rows, validMapping);
  const { parsedOrders } = transformParsedOrders(validMapping, normalizedRows);

  const allProducts = await productsService.findAllForMatching();
  const productBySku = new Map(allProducts.map((p) => [p.sku, p]));
  const productByName = new Map(allProducts.map((p) => [p.name, p]));

  const results: ProductMatchResult[] = [];
  let itemIndex = 0;

  for (const order of parsedOrders) {
    for (const item of order.outboundItems) {
      const matched = productBySku.get(item.sku) || productByName.get(item.sku);
      const productIds = matched ? [matched.id] : null;

      results.push({
        outboundItemIndex: itemIndex,
        orderId: order.orderId,
        productIds,
        sku: item.sku,
        rawValue: item.sku,
        quantity: item.quantity,
      });

      itemIndex++;
    }
  }

  return { results };
}

export async function uploadAndSaveDirect(
  buffer: Buffer,
  originalName: string,
): Promise<OutboundUploadResult> {
  const parseResult = parseExcelFile(buffer, originalName);
  const sampleRows = parseResult.rows.slice(0, 30);

  const mappingResult = await aiService.mapOutboundColumns(parseResult.headers, sampleRows);

  const columnMapping: Record<string, string> = {};
  for (const [field, value] of Object.entries(mappingResult.mapping)) {
    if (value?.columnName) {
      columnMapping[field] = value.columnName;
    }
  }

  const normalizedRows = normalizeRows(parseResult.rows, columnMapping);
  const { parsedOrders } = transformParsedOrders(columnMapping, normalizedRows);

  const fileName = Buffer.from(originalName, 'latin1').toString('utf8');
  const batchName = await outboundBatchesService.generateBatchName(fileName);
  const batch = await outboundBatchesService.create(batchName);

  const allProducts = await productsService.findAllForMatching();
  const productByName = new Map(allProducts.map((p) => [p.name, p]));
  const productBySku = new Map(allProducts.map((p) => [p.sku, p]));

  const unmatched: UnmatchedItem[] = [];
  const outbounds: { orderId: string; sku: string; quantity: number; productId?: string | null }[] = [];

  for (const order of parsedOrders) {
    for (const item of order.outboundItems) {
      const matched = productByName.get(item.sku) || productBySku.get(item.sku);

      if (matched) {
        outbounds.push({
          orderId: order.orderId,
          sku: item.sku,
          quantity: item.quantity,
          productId: matched.id,
        });
      } else {
        unmatched.push({ sku: item.sku, quantity: item.quantity, reason: 'Product not found' });
      }
    }
  }

  if (outbounds.length > 0) {
    await outboundService.createOutboundsWithOrder(batch.id, outbounds);
  }

  return {
    imported: outbounds.length,
    unmatched,
    batchName: batch.name,
    batchId: batch.id,
    totalRows: parseResult.rowCount,
  };
}
