import { NextRequest, NextResponse } from 'next/server';
import * as orderItemService from '@/lib/services/order-item';
import { handleApiError } from '@/lib/api-error';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await orderItemService.remove(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /order-items/[id]');
  }
}
