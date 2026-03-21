import { NextRequest, NextResponse } from 'next/server';
import * as boxGroupsService from '@/lib/services/box-groups';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await boxGroupsService.findOne(id);
    if (!result) {
      return NextResponse.json({ error: 'Box group not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch box group' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await boxGroupsService.deleteBoxGroup(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete box group' }, { status: 500 });
  }
}
