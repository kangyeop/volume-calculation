import * as xlsx from 'xlsx';

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

