import { NextRequest, NextResponse } from 'next/server';
import * as boxesService from '@/lib/services/boxes';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unassigned = searchParams.get('unassigned');
    const result = unassigned === 'true'
      ? await boxesService.findUnassigned()
      : await boxesService.findAll();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /boxes');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await boxesService.create(body);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'POST /boxes');
  }
}
