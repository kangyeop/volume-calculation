import { NextRequest, NextResponse } from 'next/server';
import { assignBox } from '@/lib/services/settlement';
import { handleApiError } from '@/lib/api-error';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orderId, boxId } = await request.json();
    if (!orderId || !boxId) {
      return NextResponse.json({ error: 'orderId and boxId are required' }, { status: 400 });
    }
    const result = await assignBox(id, orderId, boxId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'PATCH /settlements/[id]/assign-box');
  }
}
