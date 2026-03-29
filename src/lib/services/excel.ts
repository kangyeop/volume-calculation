import * as ExcelJS from 'exceljs';
import * as xlsx from 'xlsx';
import { db } from '@/lib/db';
import { orderItems, packingResults } from '@/lib/db/schema';
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

export async function exportPackingResults(shipmentId: string): Promise<Buffer> {
  const [results, items] = await Promise.all([
    db.query.packingResults.findMany({
      where: eq(packingResults.shipmentId, shipmentId),
      with: { order: true, box: true },
      orderBy: packingResults.groupIndex,
    }),
    db.query.orderItems.findMany({
      where: eq(orderItems.shipmentId, shipmentId),
      with: { product: true },
    }),
  ]);

  const itemsByOrderId = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByOrderId.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrderId.set(item.orderId, list);
  }

  const rows = results.map((r) => {
    const orderItemList = itemsByOrderId.get(r.order.orderId) ?? [];

    const skuComposition = orderItemList
      .map((oi) => `${oi.sku} x${oi.quantity}`)
      .join(', ');

    let aircapCount = 0;
    let barcodeCount = 0;
    for (const oi of orderItemList) {
      if (oi.product?.aircap) aircapCount += oi.quantity;
      if (oi.product?.barcode) barcodeCount += oi.quantity;
    }

    return {
      orderId: r.order.orderId,
      boxName: r.box?.name ?? '',
      skuComposition,
      aircapCount,
      barcodeCount,
    };
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Packing Results');

  worksheet.columns = [
    { header: '주문번호', key: 'orderId', width: 20 },
    { header: '박스', key: 'boxName', width: 15 },
    { header: 'SKU 구성', key: 'skuComposition', width: 40 },
    { header: '에어캡 개수', key: 'aircapCount', width: 12 },
    { header: '바코드 개수', key: 'barcodeCount', width: 12 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  for (const row of rows) {
    worksheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
