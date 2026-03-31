import { NextRequest, NextResponse } from 'next/server';
import * as estimatesService from '@/lib/services/estimates';
import { handleApiError } from '@/lib/api-error';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await estimatesService.remove(id);
    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /estimates/[id]');
  }
}
