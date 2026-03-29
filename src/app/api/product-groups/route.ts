import { NextRequest, NextResponse } from 'next/server';
import * as productGroupsService from '@/lib/services/product-groups';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const result = await productGroupsService.findAll();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /product-groups');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await productGroupsService.create(body.name, body.boxGroupId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'POST /product-groups');
  }
}
