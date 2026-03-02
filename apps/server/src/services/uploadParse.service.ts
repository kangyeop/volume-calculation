import { Injectable } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { AIService } from './ai.service';
import type { ParseUploadData } from '@wms/types';

@Injectable()
export class UploadParseService {
  constructor(
    private readonly excelService: ExcelService,
    private readonly aiService: AIService,
  ) {}

  async parseFile(
    file: Express.Multer.File,
    _projectId: string,
    _type: 'outbound' | 'product',
  ): Promise<ParseUploadData> {
    const parseResult = this.excelService.parseExcelFile(file);

    const mapping = await this.aiService.mapOutboundColumns(
      parseResult.headers,
      parseResult.rows,
    );

    return {
      sessionId: crypto.randomUUID(),
      headers: parseResult.headers,
      rowCount: parseResult.rowCount,
      mapping,
      fileName: file.originalname,
    };
  }
}
