import { NextResponse } from 'next/server';
import * as dashboardService from '@/lib/services/dashboard';

export async function GET() {
  try {
    const data = await dashboardService.getStats();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
