import ExcelJS from 'exceljs';

interface ParseResult {
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export function cellToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const v = value as { richText?: { text?: string }[]; text?: unknown; result?: unknown };
    if (Array.isArray(v.richText)) {
      return v.richText.map((r) => r?.text ?? '').join('');
    }
    if (v.text != null) return cellToString(v.text);
    if (v.result != null) return cellToString(v.result);
  }
  return String(value);
}

export async function parseExcelFile(buffer: Buffer, filename: string): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error('No sheets found in file');
  }

  const headers: string[] = [];
  const rows: Record<string, unknown>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell) => {
        headers.push(cellToString(cell.value));
      });
      return;
    }

    const rowData: Record<string, unknown> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        rowData[header] = cellToString(cell.value);
      }
    });
    rows.push(rowData);
  });

  if (rows.length === 0) {
    throw new Error('No data found in file');
  }

  return { headers, rows, rowCount: rows.length };
}
