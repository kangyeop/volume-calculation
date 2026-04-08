import { NextRequest, NextResponse } from 'next/server';
import { uploadShipment } from '@/lib/services/upload';
import { handleApiError } from '@/lib/api-error';
import { validateUploadFile } from '@/lib/upload-validation';
import type { ColumnMapping } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mappingRaw = formData.get('mapping') as string;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const validationError = validateUploadFile(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (!mappingRaw) {
      return NextResponse.json({ error: 'mapping is required' }, { status: 400 });
    }

    const mapping: ColumnMapping = JSON.parse(mappingRaw);
    if (!mapping.orderIdColumn || !mapping.skuColumn) {
      return NextResponse.json({ error: 'orderIdColumn and skuColumn are required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadShipment(buffer, file.name, mapping);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error, 'POST /upload/shipment');
  }
}
