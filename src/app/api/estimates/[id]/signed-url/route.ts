import { NextRequest, NextResponse } from 'next/server';
import * as estimatesService from '@/lib/services/estimates';
import { handleApiError } from '@/lib/api-error';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await estimatesService.getSignedUrl(id);
    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /estimates/[id]/signed-url');
  }
}
