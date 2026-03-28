import { NextRequest, NextResponse } from 'next/server';
import { autoPackUnmatched } from '@/lib/services/settlement';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await autoPackUnmatched(id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Auto pack failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
