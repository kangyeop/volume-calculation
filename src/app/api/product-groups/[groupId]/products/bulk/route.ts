import { NextRequest, NextResponse } from 'next/server';
import * as productsService from '@/lib/services/products';

export async function POST(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params;
    const body = await request.json();
    await productsService.createBulk(groupId, body);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to bulk create products' }, { status: 500 });
  }
}
