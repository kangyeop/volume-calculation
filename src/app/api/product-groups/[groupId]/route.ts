import { NextRequest, NextResponse } from 'next/server';
import * as productGroupsService from '@/lib/services/product-groups';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params;
    const result = await productGroupsService.findOne(groupId);
    if (!result) {
      return NextResponse.json({ error: 'Product group not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /product-groups/[groupId]');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params;
    const body = await request.json();
    const result = await productGroupsService.update(groupId, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'PATCH /product-groups/[groupId]');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params;
    await productGroupsService.deleteProductGroup(groupId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /product-groups/[groupId]');
  }
}
