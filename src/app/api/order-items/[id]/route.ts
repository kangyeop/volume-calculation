import { NextRequest, NextResponse } from 'next/server';
import * as orderItemService from '@/lib/services/order-item';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await orderItemService.remove(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete order item' }, { status: 500 });
  }
}
