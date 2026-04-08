import { NextRequest, NextResponse } from 'next/server';
import * as templateService from '@/lib/services/column-mapping-templates';
import { handleApiError } from '@/lib/api-error';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await templateService.update(id, body);
    if (!result) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error, 'PATCH /column-mapping-templates/[id]');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await templateService.remove(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /column-mapping-templates/[id]');
  }
}
