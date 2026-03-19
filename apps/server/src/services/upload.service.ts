import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { AIService } from './ai.service';
import { UploadRepository } from '../repositories/upload.repository';
import { DataTransformerService } from './dataTransformer.service';
import { ProductsService } from './products.service';
import { OutboundBatchService } from './outbound-batch.service';
import { RowNormalizerService } from './rowNormalizer.service';
import { UploadSessionService } from './upload-session.service';
import { TemplateMatcherService } from './template-matcher.service';
import { UploadTemplateRepository } from '../repositories/upload-template.repository';
import { ConfirmUploadDto, OutboundItemDto } from '../dto/confirmUpload.dto';
import type {
  ParseUploadDataLegacy,
  OutboundUploadResult,
  UnmatchedItem,
  ParseOutboundResponse,
  ProcessOutboundRequest,
} from '@wms/types';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly excelService: ExcelService,
    private readonly aiService: AIService,
    private readonly uploadRepository: UploadRepository,
    private readonly dataTransformerService: DataTransformerService,
    private readonly productsService: ProductsService,
    private readonly outboundBatchService: OutboundBatchService,
    private readonly rowNormalizerService: RowNormalizerService,
    private readonly uploadSessionService: UploadSessionService,
    private readonly templateMatcherService: TemplateMatcherService,
    private readonly uploadTemplateRepository: UploadTemplateRepository,
  ) {}

  async parseFile(
    file: Express.Multer.File,
    _outboundBatchId: string,
    _type: 'outbound' | 'product',
  ): Promise<ParseUploadDataLegacy> {
    const parseResult = this.excelService.parseExcelFile(file);

    const mapping = await this.aiService.mapOutboundColumns(parseResult.headers, parseResult.rows);

    return {
      sessionId: crypto.randomUUID(),
      headers: parseResult.headers,
      rowCount: parseResult.rowCount,
      rows: parseResult.rows,
      mapping,
      fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
    };
  }

  async confirmUpload(confirmUploadDto: ConfirmUploadDto): Promise<{ imported: number }> {
    const { outbounds } = await this.uploadRepository.createOutboundsWithOrder(
      confirmUploadDto.outboundBatchId,
      confirmUploadDto.outbounds,
    );

    return { imported: outbounds.length };
  }

  async uploadAndSaveDirect(file: Express.Multer.File): Promise<OutboundUploadResult> {
    const parseResult = this.excelService.parseExcelFile(file);

    const sampleRows = parseResult.rows.slice(0, 30);

    const mappingResult = await this.aiService.mapOutboundColumns(parseResult.headers, sampleRows);

    const columnMapping: Record<string, string> = {};
    for (const [field, value] of Object.entries(mappingResult.mapping)) {
      if (value?.columnName) {
        columnMapping[field] = value.columnName;
      }
    }

    this.logger.log(`Column mapping: ${JSON.stringify(columnMapping)}`);

    const normalizedRows = this.rowNormalizerService.normalizeRows(
      parseResult.rows,
      columnMapping,
    );

    const skuCol = columnMapping['sku'];
    if (skuCol) {
      const sampleSkus = normalizedRows.slice(0, 5).map((r) => r[skuCol]);
      this.logger.log(`Sample SKUs after normalize: ${JSON.stringify(sampleSkus)}`);
    }

    const { parsedOrders } = await this.dataTransformerService.transformAndMapOutbound(
      columnMapping,
      normalizedRows,
    );

    const batchName = await this.outboundBatchService.generateBatchName(
      Buffer.from(file.originalname, 'latin1').toString('utf8'),
    );
    const batch = await this.outboundBatchService.create(batchName);

    const allProducts = await this.productsService.findAllForMatching();
    const productByName = new Map<string, typeof allProducts[0]>();
    const productBySku = new Map<string, typeof allProducts[0]>();
    for (const p of allProducts) {
      if (p.name && !productByName.has(p.name)) productByName.set(p.name, p);
      if (p.sku && !productBySku.has(p.sku)) productBySku.set(p.sku, p);
    }

    this.logger.log(`Products loaded: ${allProducts.length}, matching by name(${productByName.size}) and sku(${productBySku.size})`);

    const unmatched: UnmatchedItem[] = [];
    const outbounds: OutboundItemDto[] = [];

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

    this.logger.log(`Matched: ${outbounds.length}, Unmatched: ${unmatched.length}`);
    if (unmatched.length > 0) {
      const sample = unmatched.slice(0, 5).map((u) => u.sku);
      this.logger.warn(`Unmatched sample SKUs: ${JSON.stringify(sample)}`);
    }

    if (outbounds.length > 0) {
      await this.uploadRepository.createOutboundsWithOrder(batch.id, outbounds);
    }

    return {
      imported: outbounds.length,
      unmatched,
      batchName: batch.name,
      batchId: batch.id,
      totalRows: parseResult.rowCount,
    };
  }

  async parseForPreview(file: Express.Multer.File): Promise<ParseOutboundResponse> {
    const parseResult = this.excelService.parseExcelFile(file);
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const sampleRows = parseResult.rows.slice(0, 30);

    const match = await this.templateMatcherService.findBestMatch(parseResult.headers, 'outbound');

    let suggestedMapping;
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
      suggestedMapping = await this.aiService.mapOutboundColumns(parseResult.headers, sampleRows);
      source = 'ai';
    }

    const sessionId = crypto.randomUUID();

    this.uploadSessionService.store(sessionId, {
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

  async processConfirmed(request: ProcessOutboundRequest): Promise<OutboundUploadResult> {
    const session = this.uploadSessionService.retrieve(request.sessionId);
    if (!session) {
      throw new BadRequestException('Session expired or not found');
    }

    const normalizedRows = this.rowNormalizerService.normalizeRows(
      session.rows,
      request.columnMapping,
    );

    const { parsedOrders } = await this.dataTransformerService.transformAndMapOutbound(
      request.columnMapping,
      normalizedRows,
    );

    const batchName = await this.outboundBatchService.generateBatchName(session.fileName);
    const batch = await this.outboundBatchService.create(batchName);

    const allProducts = await this.productsService.findAllForMatching();
    const productByName = new Map<string, typeof allProducts[0]>();
    const productBySku = new Map<string, typeof allProducts[0]>();
    for (const p of allProducts) {
      if (p.name && !productByName.has(p.name)) productByName.set(p.name, p);
      if (p.sku && !productBySku.has(p.sku)) productBySku.set(p.sku, p);
    }

    const unmatched: UnmatchedItem[] = [];
    const outbounds: OutboundItemDto[] = [];

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
      await this.uploadRepository.createOutboundsWithOrder(batch.id, outbounds);
    }

    if (request.saveAsTemplate && request.templateName) {
      await this.uploadTemplateRepository.save({
        name: request.templateName,
        type: 'outbound',
        headers: session.headers,
        columnMapping: request.columnMapping,
        rowStructure: 'single',
        compoundPattern: null,
      });
    }

    if (request.matchedTemplateId) {
      await this.uploadTemplateRepository.incrementUsage(request.matchedTemplateId);
    }

    this.uploadSessionService.remove(request.sessionId);

    return {
      imported: outbounds.length,
      unmatched,
      batchName: batch.name,
      batchId: batch.id,
      totalRows: session.rows.length,
    };
  }
}
