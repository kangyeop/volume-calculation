import { Injectable } from '@nestjs/common';
import { ExcelParserService } from './excelParser.service';
import { AIColumnMapperService } from './aiColumnMapper.service';
import type { ParseUploadData } from '@wms/types';

@Injectable()
export class UploadParseService {
  constructor(
    private readonly excelParserService: ExcelParserService,
    private readonly aiColumnMapperService: AIColumnMapperService,
  ) {}

  async parseFile(
    file: Express.Multer.File,
    _projectId: string,
    _type: 'outbound' | 'product',
  ): Promise<ParseUploadData> {
    const parseResult = this.excelParserService.parseExcelFile(file);

    const mapping = await this.aiColumnMapperService.mapOutboundColumns(
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
