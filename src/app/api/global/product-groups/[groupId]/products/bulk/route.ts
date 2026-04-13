import { NextRequest, NextResponse } from 'next/server';
import * as globalProductsService from '@/lib/services/global-products';
import { handleApiError } from '@/lib/api-error';

export async function POST(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params;
    const body = await request.json();
    await globalProductsService.createBulk(groupId, body);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'POST /global/product-groups/[groupId]/products/bulk');
  }
}
