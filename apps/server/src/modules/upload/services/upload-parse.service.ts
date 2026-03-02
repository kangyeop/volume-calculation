import { Injectable } from '@nestjs/common';
import { ExcelParserService } from './excel-parser.service';
import { UploadSessionService } from './upload-session.service';
import { AIColumnMapperService } from '../../ai/services/ai-column-mapper.service';
import type { ParseUploadData, ParseMappingUploadData } from '@wms/types';

@Injectable()
export class UploadParseService {
  constructor(
    private readonly excelParserService: ExcelParserService,
    private readonly uploadSessionService: UploadSessionService,
    private readonly aiColumnMapperService: AIColumnMapperService,
  ) {}

  async parseAndMapOutbound(
    file: Express.Multer.File,
    projectId: string,
  ): Promise<ParseMappingUploadData> {
    const parseResult = this.excelParserService.parseExcelFile(file);

    const columnMapping = await this.aiColumnMapperService.mapOutboundColumns(
      parseResult.headers,
      parseResult.rows,
    );

    const sessionId = this.uploadSessionService.createSession({
      type: 'outbound',
      projectId,
      headers: parseResult.headers,
      mapping: columnMapping,
      rows: parseResult.rows,
      fileName: file.originalname,
    });

    return {
      sessionId,
      headers: parseResult.headers,
      rowCount: parseResult.rowCount,
      columnMapping,
      fileName: file.originalname,
    };
  }

  async parseAndMapProduct(file: Express.Multer.File, projectId: string): Promise<ParseUploadData> {
    const parseResult = this.excelParserService.parseExcelFile(file);

    const mapping = await this.aiColumnMapperService.mapOutboundColumns(
      parseResult.headers,
      parseResult.rows,
    );

    const sessionId = this.uploadSessionService.createSession({
      type: 'product',
      projectId,
      headers: parseResult.headers,
      mapping,
      rows: parseResult.rows,
      fileName: file.originalname,
    });

    return {
      sessionId,
      headers: parseResult.headers,
      rowCount: parseResult.rowCount,
      mapping,
      fileName: file.originalname,
    };
  }
}
