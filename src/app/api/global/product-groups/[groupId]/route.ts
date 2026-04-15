import { NextRequest, NextResponse } from 'next/server';
import * as globalProductGroupsService from '@/lib/services/global-product-groups';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params;
    const result = await globalProductGroupsService.findOne(groupId);
    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /global/product-groups/[groupId]');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params;
    const body = await request.json();
    const result = await globalProductGroupsService.update(groupId, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'PATCH /global/product-groups/[groupId]');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params;
    await globalProductGroupsService.deleteGlobalProductGroup(groupId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /global/product-groups/[groupId]');
  }
}
