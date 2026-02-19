import { Injectable, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';

interface ParseResult {
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  sampleRows: Record<string, unknown>[];
}

@Injectable()
export class ExcelParserService {
  private readonly logger = new Logger(ExcelParserService.name);

  parseExcelFile(file: Express.Multer.File): ParseResult {
    try {
      this.logger.log(`Parsing file: ${file.originalname}`);

      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error('No sheets found in the file');
      }

      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',
        raw: false,
      });

      if (data.length === 0) {
        throw new Error('No data found in the file');
      }

      const headers = data.length > 0 ? Object.keys(data[0]) : [];
      const sampleRows = data.slice(0, 3);

      this.logger.log(
        `Successfully parsed ${file.originalname}: ${headers.length} headers, ${data.length} rows`,
      );

      return {
        headers,
        rows: data,
        rowCount: data.length,
        sampleRows,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to parse file: ${err.message}`, err.stack);
      throw err;
    }
  }
}
