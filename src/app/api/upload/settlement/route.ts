import { NextRequest, NextResponse } from 'next/server';
import { uploadSettlement } from '@/lib/services/settlement';
import { handleApiError } from '@/lib/api-error';
import { validateUploadFile } from '@/lib/upload-validation';
import type { ColumnMapping } from '@/types';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    const validationError = validateUploadFile(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const mappingRaw = formData.get('mapping') as string;
    if (!mappingRaw) {
      return NextResponse.json({ error: 'mapping is required' }, { status: 400 });
    }
    const mapping: ColumnMapping = JSON.parse(mappingRaw);

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadSettlement(buffer, file.name, mapping);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error, 'POST /upload/settlement');
  }
}
