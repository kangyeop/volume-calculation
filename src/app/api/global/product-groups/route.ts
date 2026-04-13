import { NextRequest, NextResponse } from 'next/server';
import * as globalProductGroupsService from '@/lib/services/global-product-groups';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const result = await globalProductGroupsService.findAll();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /global/product-groups');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await globalProductGroupsService.create(body.name);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'POST /global/product-groups');
  }
}
