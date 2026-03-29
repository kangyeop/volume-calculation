import { NextRequest, NextResponse } from 'next/server';
import * as boxGroupsService from '@/lib/services/box-groups';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const result = await boxGroupsService.findAll();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /box-groups');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await boxGroupsService.create(body.name);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'POST /box-groups');
  }
}
