import { NextRequest, NextResponse } from 'next/server';
import * as boxesService from '@/lib/services/boxes';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await boxesService.findOne(id);
    if (!result) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /boxes/[id]');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await boxesService.update(id, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'PATCH /boxes/[id]');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await boxesService.remove(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /boxes/[id]');
  }
}
