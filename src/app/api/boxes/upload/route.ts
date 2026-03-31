import { NextRequest, NextResponse } from 'next/server';
import * as boxesService from '@/lib/services/boxes';
import { parseExcelFile } from '@/lib/services/excel';
import { handleApiError } from '@/lib/api-error';
import { validateUploadFile } from '@/lib/upload-validation';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const validationError = validateUploadFile(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows, headers } = await parseExcelFile(buffer, file.name);

    const result = await boxesService.uploadBoxes(groupId, { headers, rows });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error, 'POST /boxes/upload');
  }
}
