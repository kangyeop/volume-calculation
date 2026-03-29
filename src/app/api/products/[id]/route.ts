import { NextRequest, NextResponse } from 'next/server';
import * as productsService from '@/lib/services/products';
import { handleApiError } from '@/lib/api-error';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const dto: Parameters<typeof productsService.update>[1] = {};
    if (typeof body.name === 'string') dto.name = body.name;
    if (typeof body.width === 'number') dto.width = body.width;
    if (typeof body.length === 'number') dto.length = body.length;
    if (typeof body.height === 'number') dto.height = body.height;
    if (typeof body.barcode === 'boolean') dto.barcode = body.barcode;
    if (typeof body.aircap === 'boolean') dto.aircap = body.aircap;

    const result = await productsService.update(id, dto);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'PATCH /products/[id]');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await productsService.remove(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /products/[id]');
  }
}
