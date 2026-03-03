import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as xlsx from 'xlsx';
import { PackingResultDetailsRepository } from '../repositories/packing-result-details.repository';
import { PackingResultDetailEntity } from '../entities/packingResultDetail.entity';
import { FileStorageService } from './fileStorage.service';

interface ParseResult {
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

@Injectable()
export class ExcelService {
  private readonly logger = new Logger(ExcelService.name);

  constructor(
    private readonly packingResultDetailRepository: PackingResultDetailsRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  parseExcelFile(file: Express.Multer.File): ParseResult {
    try {
      this.logger.log(`Parsing file: ${file.originalname}`);

      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error('No sheets found in file');
      }

      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',
        raw: false,
      });

      if (data.length === 0) {
        throw new Error('No data found in file');
      }

      const headers = data.length > 0 ? Object.keys(data[0]) : [];

      this.logger.log(
        `Successfully parsed ${file.originalname}: ${headers.length} headers, ${data.length} rows`,
      );

      return {
        headers,
        rows: data,
        rowCount: data.length,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to parse file: ${err.message}`, err.stack);
      throw err;
    }
  }

  async exportPackingResults(projectId: string, batchId: string): Promise<Buffer> {
    if (!batchId) {
      throw new BadRequestException('batchId is required for export');
    }

    const filePath = `${this.fileStorageService['outboundDir']}/${batchId}.xlsx`;

    const fileExists = await this.fileStorageService.fileExists(filePath);

    if (fileExists) {
      return this.exportWithOriginalFile(filePath, batchId);
    }

    return this.exportWithoutOriginalFile(projectId, batchId);
  }

  private async exportWithOriginalFile(filePath: string, batchId: string): Promise<Buffer> {
    const fileBuffer = await this.fileStorageService.readFile(filePath);

    const originalWorkbook = new ExcelJS.Workbook();
    await originalWorkbook.xlsx.load(fileBuffer as any);

    const results = await this.packingResultDetailRepository
      .createQueryBuilderWithWhere('detail', { batchId })
      .orderBy('detail.orderId', 'ASC')
      .addOrderBy('detail.sku', 'ASC')
      .getMany();

    const worksheet = originalWorkbook.worksheets[0];

    if (!worksheet) {
      throw new BadRequestException('Invalid Excel file: No worksheet found');
    }

    const boxColumnLetter = String.fromCharCode(65 + worksheet.columnCount);
    const boxNumberColumnLetter = String.fromCharCode(66 + worksheet.columnCount);

    worksheet.getColumn(boxColumnLetter).header = '박스명';
    worksheet.getColumn(boxNumberColumnLetter).header = '박스 번호';

    const rowMap = new Map<string, PackingResultDetailEntity>();

    for (const result of results) {
      const key = `${result.orderId}_${result.sku}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, result);
      }
    }

    const headerRow = worksheet.getRow(1);
    headerRow.getCell(boxColumnLetter).value = '박스명';
    headerRow.getCell(boxNumberColumnLetter).value = '박스 번호';
    headerRow.font = { bold: true };

    const dataRows = worksheet.getSheetValues();
    const headerColumns: string[] = (dataRows[0] || []) as string[];

    let orderIdIndex = headerColumns.findIndex(
      (h) => h?.toLowerCase().includes('주문') || h?.toLowerCase().includes('order'),
    );
    let skuIndex = headerColumns.findIndex(
      (h) => h?.toLowerCase().includes('sku') || h?.toLowerCase().includes('상품'),
    );

    if (orderIdIndex === -1) orderIdIndex = 0;
    if (skuIndex === -1) skuIndex = 1;

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const orderIdValue = String(row.getCell(orderIdIndex + 1).value ?? '');
      const skuValue = String(row.getCell(skuIndex + 1).value ?? '');

      const key = [orderIdValue, skuValue].join('_');
      const result = rowMap.get(key);

      if (result) {
        const boxNameCell = row.getCell(boxColumnLetter);
        const boxNumberCell = row.getCell(boxNumberColumnLetter);

        boxNameCell.value = result.boxName;
        boxNumberCell.value = result.boxNumber || 0;

        if (result.unpacked) {
          row.eachCell({ includeEmpty: false }, (cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFCCCC' },
            };
          });
        }
      }
    }

    const buffer = await originalWorkbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async exportWithoutOriginalFile(projectId: string, batchId: string): Promise<Buffer> {
    const results = await this.packingResultDetailRepository
      .createQueryBuilderWithWhere('detail', { projectId, batchId })
      .orderBy('detail.orderId', 'ASC')
      .addOrderBy('detail.boxIndex', 'ASC')
      .addOrderBy('detail.boxNumber', 'ASC')
      .getMany();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Packing Results');

    worksheet.columns = [
      { header: '주문번호', key: 'orderId', width: 20 },
      { header: '수령인', key: 'recipientName', width: 15 },
      { header: '연락처', key: 'recipientPhone', width: 15 },
      { header: '우편번호', key: 'zipCode', width: 10 },
      { header: '주소', key: 'address', width: 30 },
      { header: '상세주소', key: 'detailAddress', width: 20 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: '상품명', key: 'productName', width: 25 },
      { header: '수량', key: 'quantity', width: 10 },
      { header: '박스명', key: 'boxName', width: 15 },
      { header: '박스 번호', key: 'boxNumber', width: 12 },
      { header: '박스 순서', key: 'boxIndex', width: 12 },
      { header: '미포장 여부', key: 'unpacked', width: 12 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    for (const result of results) {
      const row = worksheet.addRow({
        orderId: result.orderId,
        recipientName: result.recipientName,
        sku: result.sku,
        productName: result.productName,
        quantity: result.quantity,
        boxName: result.boxName,
        boxNumber: result.boxNumber,
        boxIndex: result.boxIndex,
        unpacked: result.unpacked ? 'Y' : 'N',
      });

      if (result.unpacked) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFCCCC' },
          };
        });
      }
    }

    worksheet.columns.forEach((column) => {
      if (column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value;
          let cellLength = 10;
          if (cellValue) {
            if (typeof cellValue === 'string') {
              cellLength = cellValue.length;
            } else if (typeof cellValue === 'number' || typeof cellValue === 'boolean') {
              cellLength = cellValue.toString().length;
            }
          }
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
