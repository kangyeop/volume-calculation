import { NextRequest, NextResponse } from 'next/server';
import { autoPackUnmatched } from '@/lib/services/settlement';
import { handleApiError } from '@/lib/api-error';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await autoPackUnmatched(id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error, 'POST /settlements/[id]/auto-pack');
  }
}
