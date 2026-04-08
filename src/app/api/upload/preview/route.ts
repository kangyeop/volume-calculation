import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFile } from '@/lib/services/excel';
import { handleApiError } from '@/lib/api-error';
import { validateUploadFile } from '@/lib/upload-validation';

export async function POST(request: NextRequest) {
  try {
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
    const result = await parseExcelFile(buffer, file.name);

    return NextResponse.json({
      success: true,
      data: {
        headers: result.headers,
        sampleRows: result.rows.slice(0, 5),
        totalRows: result.rowCount,
      },
    });
  } catch (error) {
    return handleApiError(error, 'POST /upload/preview');
  }
}
