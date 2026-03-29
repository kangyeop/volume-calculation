import { NextRequest, NextResponse } from 'next/server';
import * as boxGroupsService from '@/lib/services/box-groups';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await boxGroupsService.findOne(id);
    if (!result) {
      return NextResponse.json({ error: 'Box group not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /box-groups/[id]');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    await boxGroupsService.updateBoxAssignments(id, body.boxIds);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'PATCH /box-groups/[id]');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await boxGroupsService.deleteBoxGroup(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /box-groups/[id]');
  }
}
