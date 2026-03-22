import { NextRequest, NextResponse } from 'next/server';
import { uploadShipment } from '@/lib/services/upload';
import type { ShipmentFormat } from '@/lib/services/format-parser';

const VALID_FORMATS: ShipmentFormat[] = ['adjustment', 'beforeMapping', 'afterMapping'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const format = formData.get('format') as string;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!format || !VALID_FORMATS.includes(format as ShipmentFormat)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadShipment(buffer, file.name, format as ShipmentFormat);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to upload shipment file' }, { status: 500 });
  }
}
