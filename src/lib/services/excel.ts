import * as ExcelJS from 'exceljs';
import * as xlsx from 'xlsx';
import { db } from '@/lib/db';
import { packingResultDetails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface ParseResult {
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export function parseExcelFile(buffer: Buffer, filename: string): ParseResult {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
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

    return {
      headers,
      rows: data,
      rowCount: data.length,
    };
  } catch (error) {
    const err = error as Error;
    throw err;
  }
}

export async function exportPackingResults(outboundBatchId: string): Promise<Buffer> {
  const results = await db
    .select()
    .from(packingResultDetails)
    .where(eq(packingResultDetails.outboundBatchId, outboundBatchId))
    .orderBy(packingResultDetails.orderId, packingResultDetails.boxIndex, packingResultDetails.boxNumber);

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
