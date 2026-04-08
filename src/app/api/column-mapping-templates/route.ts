import { NextRequest, NextResponse } from 'next/server';
import * as templateService from '@/lib/services/column-mapping-templates';
import { handleApiError } from '@/lib/api-error';
import type { MappingType } from '@/types';

const VALID_TYPES: MappingType[] = ['shipment', 'settlement', 'product'];

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get('type') as MappingType;
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
    const result = await templateService.listByType(type);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error, 'GET /column-mapping-templates');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.type || !body.mapping) {
      return NextResponse.json({ error: 'name, type, mapping are required' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(body.type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    const result = await templateService.create(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error, 'POST /column-mapping-templates');
  }
}
