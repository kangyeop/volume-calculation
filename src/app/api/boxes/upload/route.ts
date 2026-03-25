import { NextRequest, NextResponse } from 'next/server';
import * as boxesService from '@/lib/services/boxes';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

    const result = await boxesService.uploadBoxes(groupId, { headers, rows });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to upload boxes' }, { status: 500 });
  }
}
