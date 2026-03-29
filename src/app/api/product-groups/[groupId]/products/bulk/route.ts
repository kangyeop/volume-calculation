import { NextRequest, NextResponse } from 'next/server';
import * as productsService from '@/lib/services/products';
import { handleApiError } from '@/lib/api-error';

export async function POST(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params;
    const body = await request.json();
    await productsService.createBulk(groupId, body);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'POST /product-groups/[groupId]/products/bulk');
  }
}
