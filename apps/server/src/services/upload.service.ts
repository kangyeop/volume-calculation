import { Injectable } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { AIService } from './ai.service';
import { UploadRepository } from '../repositories/upload.repository';
import { ConfirmUploadDto } from '../dto/confirmUpload.dto';
import type { ParseUploadData } from '@wms/types';

@Injectable()
export class UploadService {
  constructor(
    private readonly excelService: ExcelService,
    private readonly aiService: AIService,
    private readonly uploadRepository: UploadRepository,
  ) {}

  async parseFile(
    file: Express.Multer.File,
    _projectId: string,
    _type: 'outbound' | 'product',
  ): Promise<ParseUploadData> {
    const parseResult = this.excelService.parseExcelFile(file);

    const mapping = await this.aiService.mapOutboundColumns(parseResult.headers, parseResult.rows);

    return {
      sessionId: crypto.randomUUID(),
      headers: parseResult.headers,
      rowCount: parseResult.rowCount,
      rows: parseResult.rows,
      mapping,
      fileName: file.originalname,
    };
  }

  async confirmUpload(
    confirmUploadDto: ConfirmUploadDto,
  ): Promise<{ imported: number; batchId: string; batchName: string }> {
    const { outbounds, batchId, batchName } = await this.uploadRepository.createOutboundsWithOrder(
      confirmUploadDto.projectId,
      confirmUploadDto.outbounds,
    );

    return { imported: outbounds.length, batchId, batchName };
  }
}
