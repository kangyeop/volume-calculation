import { NextRequest, NextResponse } from 'next/server';
import * as productGroupsService from '@/lib/services/product-groups';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await productGroupsService.findOne(id);
    if (!result) {
      return NextResponse.json({ error: 'Product group not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch product group' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await productGroupsService.deleteProductGroup(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product group' }, { status: 500 });
  }
}
