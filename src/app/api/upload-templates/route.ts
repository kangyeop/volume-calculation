import { NextResponse } from 'next/server';
import * as uploadTemplatesService from '@/lib/services/upload-templates';

export async function GET() {
  try {
    const templates = await uploadTemplatesService.findAll();
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch upload templates' }, { status: 500 });
  }
}
