import { NextRequest, NextResponse } from 'next/server';
import * as projectsService from '@/lib/services/projects';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const result = await projectsService.findAll();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /projects');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await projectsService.create(body);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'POST /projects');
  }
}
