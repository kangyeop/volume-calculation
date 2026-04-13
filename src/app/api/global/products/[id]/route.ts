import { NextRequest, NextResponse } from 'next/server';
import * as globalProductsService from '@/lib/services/global-products';
import { handleApiError } from '@/lib/api-error';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const dto: Parameters<typeof globalProductsService.update>[1] = {};
    if (typeof body.name === 'string') dto.name = body.name;
    if (typeof body.width === 'number') dto.width = body.width;
    if (typeof body.length === 'number') dto.length = body.length;
    if (typeof body.height === 'number') dto.height = body.height;
    if (typeof body.innerQuantity === 'number') dto.innerQuantity = body.innerQuantity;

    const result = await globalProductsService.update(id, dto);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'PATCH /global/products/[id]');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await globalProductsService.remove(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /global/products/[id]');
  }
}
