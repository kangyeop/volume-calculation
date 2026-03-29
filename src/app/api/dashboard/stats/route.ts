import { NextResponse } from 'next/server';
import * as dashboardService from '@/lib/services/dashboard';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const data = await dashboardService.getStats();
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, 'GET /dashboard/stats');
  }
}
