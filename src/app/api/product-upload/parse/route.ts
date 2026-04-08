import { NextRequest, NextResponse } from 'next/server';
import * as productUploadService from '@/lib/services/product-upload';
import { handleApiError } from '@/lib/api-error';
import { validateUploadFile } from '@/lib/upload-validation';
import type { ColumnMapping } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
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
    const result = await productUploadService.parseFile(buffer, file.name, mapping);

    if (result.errors.length > 0 && result.products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid products found', errors: result.errors },
        { status: 400 },
      );
    }

    const imported = await productUploadService.confirmProductUpload(groupId, result.products);

    return NextResponse.json({
      success: true,
      data: {
        ...imported,
        rowCount: result.rowCount,
        errors: result.errors,
        fileName: result.fileName,
      },
    });
  } catch (error) {
    return handleApiError(error, 'POST /product-upload/parse');
  }
}
