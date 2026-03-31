import { NextRequest, NextResponse } from 'next/server';
import * as estimatesService from '@/lib/services/estimates';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search') || undefined;
    const result = await estimatesService.findAll(search);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /estimates');
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get('name');
    const file = formData.get('file');

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: '견적서 이름은 필수입니다.' }, { status: 400 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'PDF 파일은 필수입니다.' }, { status: 400 });
    }

    const result = await estimatesService.create(name, file);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('PDF') ||
      error.message.includes('파일')
    )) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error, 'POST /estimates');
  }
}
