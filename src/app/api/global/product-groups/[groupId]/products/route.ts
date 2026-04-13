import { NextRequest, NextResponse } from 'next/server';
import * as globalProductsService from '@/lib/services/global-products';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params;
    const result = await globalProductsService.findAll(groupId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /global/product-groups/[groupId]/products');
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params;
    const body = await request.json();
    const result = await globalProductsService.create(groupId, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'POST /global/product-groups/[groupId]/products');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    await globalProductsService.removeBulk(body.ids);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /global/product-groups/[groupId]/products');
  }
}
