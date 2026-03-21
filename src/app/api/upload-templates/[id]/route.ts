import { NextRequest, NextResponse } from 'next/server';
import * as uploadTemplatesService from '@/lib/services/upload-templates';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await uploadTemplatesService.deleteTemplate(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete upload template' }, { status: 500 });
  }
}
