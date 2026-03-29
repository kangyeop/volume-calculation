import { NextResponse } from 'next/server';
import * as projectsService from '@/lib/services/projects';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const result = await projectsService.getStats();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /projects/stats');
  }
}
