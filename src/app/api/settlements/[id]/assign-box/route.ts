import { NextRequest, NextResponse } from 'next/server';
import { assignBox } from '@/lib/services/settlement';

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
    const message = error instanceof Error ? error.message : 'Failed to assign box';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
