import { NextRequest, NextResponse } from 'next/server';
import * as productUploadService from '@/lib/services/product-upload';

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = productUploadService.parseFile(buffer, file.name);

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
    return NextResponse.json({ error: 'Failed to parse product file' }, { status: 500 });
  }
}
