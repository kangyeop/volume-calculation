import { NextRequest, NextResponse } from 'next/server';
import * as productsService from '@/lib/services/products';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params;
    const result = await productsService.findAll(groupId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /product-groups/[groupId]/products');
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params;
    const body = await request.json();
    const result = await productsService.create(groupId, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'POST /product-groups/[groupId]/products');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const body = await request.json();
    await productsService.removeBulk(body.ids);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /product-groups/[groupId]/products');
  }
}
